"""Clerk session authentication for browser-originated API requests."""

from typing import Annotated

from clerk_backend_api import AuthenticateRequestOptions, authenticate_request
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)


def require_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> str:
    """Accept only a verified Clerk session JWT, never an unsigned claim or cookie alone."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Sign in required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = request.app.state.settings
    try:
        state = authenticate_request(
            request,
            AuthenticateRequestOptions(
                secret_key=settings.clerk_secret_key,
                jwt_key=settings.clerk_jwt_key or None,
                authorized_parties=list(settings.clerk_authorized_parties),
                accepts_token=["session_token"],
            ),
        )
    except Exception:  # noqa: BLE001 - never expose verification details or credentials
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    payload = state.payload or {}
    if not state.is_signed_in or not isinstance(payload.get("sub"), str) or payload.get("sts") == "pending":
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload["sub"]


def require_operator(request: Request, user_id: Annotated[str, Depends(require_user)]) -> str:
    """Only explicitly allowlisted Clerk users may access complaint operations data."""
    if user_id not in request.app.state.settings.clerk_operator_user_ids:
        raise HTTPException(status_code=403, detail="Operator access required")
    return user_id

