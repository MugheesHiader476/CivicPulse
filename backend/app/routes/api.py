from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from app.auth import require_citizen, require_operator, require_user
from app.providers.triage.selector import ProviderUnavailable
from app.schemas import (
    Category,
    Complaint,
    ComplaintCreate,
    ComplaintPage,
    CurrentUser,
    ErrorResponse,
    Priority,
    ProviderSelection,
    ProvidersMeta,
    Stats,
    Status,
    StatusUpdate,
    ValidationErrorResponse,
)
from app.security import client_ip
from app.services.complaints import (
    ComplaintService,
    InvalidTransition,
    MissingComplaint,
    RateLimited,
)

router = APIRouter()


def service(request: Request) -> ComplaintService:
    return request.app.state.service


Service = Annotated[ComplaintService, Depends(service)]


@router.get("/api/me", response_model=CurrentUser)
def current_user(request: Request, user_id: Annotated[str, Depends(require_user)]):
    is_operator = user_id in request.app.state.settings.clerk_operator_user_ids
    return CurrentUser(role="operator" if is_operator else "citizen")


@router.post("/api/complaints", response_model=Complaint, status_code=201,
             responses={400: {"model": ValidationErrorResponse}, 403: {"model": ErrorResponse}, 429: {"model": ErrorResponse}})
def create_complaint(data: ComplaintCreate, request: Request, response: Response, service: Service,
                     user_id: Annotated[str, Depends(require_citizen)]):
    try:
        return service.create(data, user_id, client_ip(request), request.state.request_id)
    except RateLimited as exc:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please retry later.", headers={"Retry-After": str(exc.retry_after)}) from None


@router.get("/api/complaints", response_model=ComplaintPage, dependencies=[Depends(require_operator)], responses={400: {"model": ValidationErrorResponse}})
def list_complaints(service: Service, category: Category | None = None, priority: Priority | None = None,
                    status_filter: Annotated[Status | None, Query(alias="status")] = None,
                    page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 20):
    return service.list(category, priority, status_filter, page, page_size)

@router.get("/api/my/complaints", response_model=ComplaintPage,
            responses={400: {"model": ValidationErrorResponse}, 403: {"model": ErrorResponse}})
def list_my_complaints(service: Service, user_id: Annotated[str, Depends(require_citizen)],
                       page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 20):
    return service.list_for_reporter(user_id, page, page_size)

@router.get("/api/my/complaints/{id}", response_model=Complaint,
            responses={403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}})
def get_my_complaint(id: UUID, service: Service, user_id: Annotated[str, Depends(require_citizen)]):
    try:
        return service.get_for_reporter(id, user_id)
    except MissingComplaint:
        raise HTTPException(status_code=404, detail=f"Complaint {id} not found") from None


@router.get("/api/complaints/{id}", response_model=Complaint, dependencies=[Depends(require_operator)], responses={400: {"model": ValidationErrorResponse}, 404: {"model": ErrorResponse}})
def get_complaint(id: UUID, service: Service):
    try:
        return service.get(id)
    except MissingComplaint:
        raise HTTPException(status_code=404, detail=f"Complaint {id} not found") from None


@router.patch("/api/complaints/{id}/status", response_model=Complaint, dependencies=[Depends(require_operator)],
              responses={400: {"model": ValidationErrorResponse}, 404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}})
def update_status(id: UUID, body: StatusUpdate, service: Service):
    try:
        return service.update_status(id, body.status)
    except MissingComplaint:
        raise HTTPException(status_code=404, detail=f"Complaint {id} not found") from None
    except InvalidTransition as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None


@router.get("/api/stats", response_model=Stats, dependencies=[Depends(require_operator)], responses={200: {"headers": {"X-Cache": {"description": "Redis cache state", "schema": {"type": "string", "enum": ["HIT", "MISS"]}}}}})
def get_stats(response: Response, service: Service):
    stats, state = service.stats()
    response.headers["X-Cache"] = state
    return stats


@router.get("/api/meta/providers", response_model=ProvidersMeta, dependencies=[Depends(require_operator)])
def get_providers(service: Service):
    return service.providers()


@router.put("/api/meta/providers", response_model=ProvidersMeta, dependencies=[Depends(require_operator)],
            responses={409: {"model": ErrorResponse}})
def choose_provider(body: ProviderSelection, service: Service):
    try:
        return service.choose_provider(body)
    except ProviderUnavailable as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
