import hashlib
import json
import time
from typing import cast

from redis import Redis

from app.schemas import TriageResult


class RedisCache:
    RATE_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('TTL', KEYS[1])}
"""

    def __init__(self, client: Redis):
        self.client = client

    def check_rate(self, client_ip: str, limit: int) -> int:
        now = int(time.time())
        window = now // 60
        expires_in = 60 - now % 60
        digest = hashlib.sha256(client_ip.encode()).hexdigest()
        count, ttl = cast(tuple[int, int], self.client.eval(self.RATE_SCRIPT, 1, f"rate:{digest}:{window}", expires_in))
        return max(1, int(ttl)) if int(count) > limit else 0

    def get_stats(self) -> tuple[dict | None, int]:
        version = int(cast(bytes | None, self.client.get("stats:version")) or 0)
        raw = cast(bytes | None, self.client.get(f"stats:v1:{version}"))
        return (json.loads(raw) if raw else None), version

    def set_stats(self, value: dict, version: int) -> None:
        self.client.set(f"stats:v1:{version}", json.dumps(value), ex=30)

    def invalidate_stats(self) -> None:
        self.client.incr("stats:version")

    def get_triage(self, key: str) -> tuple[TriageResult, str] | None:
        raw = cast(bytes | None, self.client.get(f"triage:{key}"))
        if raw is None:
            return None
        value = json.loads(raw)
        return TriageResult.model_validate(value["result"]), str(value["provider"])

    def set_triage(self, key: str, result: TriageResult, provider: str) -> None:
        self.client.set(f"triage:{key}", json.dumps({"result": result.model_dump(), "provider": provider}), ex=86400)

    def get_triage_provider(self) -> str | None:
        value = self.client.get("triage:active_provider")
        if value is None:
            return None
        return value.decode() if isinstance(value, bytes) else str(value)

    def set_triage_provider(self, provider: str) -> None:
        self.client.set("triage:active_provider", provider)

    def ping(self) -> None:
        self.client.ping()

    def close(self) -> None:
        self.client.close()
