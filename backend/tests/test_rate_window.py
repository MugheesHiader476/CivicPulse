from app.providers.cache import RedisCache


def test_rate_limit_expires_at_minute_boundary(monkeypatch):
    class Counter:
        def __init__(self):
            self.counts = {}
            self.expiries = []

        def eval(self, script, key_count, key, expires_in):
            self.expiries.append(expires_in)
            self.counts[key] = self.counts.get(key, 0) + 1
            return self.counts[key], expires_in

    counter = Counter()
    cache = RedisCache(counter)
    monkeypatch.setattr("app.providers.cache.time.time", lambda: 119)
    assert cache.check_rate("127.0.0.1", 1) == 0
    assert cache.check_rate("127.0.0.1", 1) == 1
    monkeypatch.setattr("app.providers.cache.time.time", lambda: 120)
    assert cache.check_rate("127.0.0.1", 1) == 0
    assert counter.expiries == [1, 1, 60]
