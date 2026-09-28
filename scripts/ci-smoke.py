"""Real Compose smoke test using an ephemeral CI-only Clerk-style session key."""

import argparse
import os
import time
from pathlib import Path

import httpx
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

DEFAULT_BASE_URL = "http://127.0.0.1:8080"
USER_ID = "ci_operator"
CITIZEN_ID = "ci_citizen"


def prepare(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_path = directory / "civicpulse-ci-private.pem"
    public_path = directory / "civicpulse-ci-public.pem"
    private_path.write_bytes(private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ))
    os.chmod(private_path, 0o600)
    public_path.write_bytes(private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ))
    print("Prepared temporary CI signing key outside the repository.")


def expect(response: httpx.Response, status: int) -> dict:
    if response.status_code != status:
        raise AssertionError(f"{response.request.method} {response.request.url.path}: "
                             f"expected HTTP {status}, got {response.status_code}: {response.text[:300]}")
    return response.json()


def verify(directory: Path, base_url: str = DEFAULT_BASE_URL, expected_provider: str = "simulated") -> None:
    base_url = base_url.rstrip("/")
    private_key = serialization.load_pem_private_key(
        (directory / "civicpulse-ci-private.pem").read_bytes(), password=None,
    )
    if not isinstance(private_key, rsa.RSAPrivateKey):
        raise TypeError("CI signing key is not RSA")
    now = int(time.time())
    def token(user_id: str) -> str:
        return jwt.encode({
            "iss": "https://test.clerk.accounts.dev",
            "sub": user_id,
            "sid": f"sess_{user_id}",
            "azp": base_url,
            "iat": now,
            "nbf": now,
            "exp": now + 300,
        }, private_key, algorithm="RS256")

    with (
        httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {token(USER_ID)}"}, timeout=15) as admin,
        httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {token(CITIZEN_ID)}"}, timeout=15) as citizen,
    ):
        created = expect(citizen.post("/api/complaints", json={
            "text": "Burst water pipe flooding Street 12",
            "location": "Street 12, Lahore",
        }), 201)
        assert created["category"] == "water", created
        assert created["triaged_by"] == expected_provider, created
        complaint_id = created["id"]
        detail = expect(admin.get(f"/api/complaints/{complaint_id}"), 200)
        assert detail["id"] == complaint_id
        own = expect(citizen.get(f"/api/my/complaints/{complaint_id}"), 200)
        assert own["id"] == complaint_id
        expect(admin.post("/api/complaints", json={
            "text": "Admins cannot submit citizen reports",
            "location": "Test Street",
        }), 403)
        expect(citizen.get("/api/stats"), 403)
        first = admin.get("/api/stats")
        expect(first, 200)
        assert first.headers.get("X-Cache") == "MISS", first.headers
        second = admin.get("/api/stats")
        stats = expect(second, 200)
        assert second.headers.get("X-Cache") == "HIT", second.headers
        assert stats["total"] >= 1
    print("Deployment smoke passed: citizen submit and ownership, admin access, role denials, cache MISS -> HIT.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("prepare", "verify"))
    parser.add_argument("directory", type=Path)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--expected-provider", default="simulated")
    args = parser.parse_args()
    if args.action == "prepare":
        prepare(args.directory)
    else:
        verify(args.directory, args.base_url, args.expected_provider)
