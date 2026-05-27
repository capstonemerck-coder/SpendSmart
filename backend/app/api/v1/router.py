"""API v1 router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, cycles, reports, scenarios, uploads, users

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(cycles.router)
api_router.include_router(uploads.router)
api_router.include_router(scenarios.router)
api_router.include_router(reports.router)
