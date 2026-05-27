"""
Application-level exception hierarchy.
All domain errors should subclass AppError.
"""
from __future__ import annotations


class AppError(Exception):
    """Base application exception."""
    status_code: int = 500
    detail: str = "An unexpected error occurred."

    def __init__(self, detail: str | None = None, status_code: int | None = None):
        self.detail = detail or self.__class__.detail
        self.status_code = status_code or self.__class__.status_code
        super().__init__(self.detail)


class NotFoundError(AppError):
    status_code = 404
    detail = "Resource not found."


class ValidationError(AppError):
    status_code = 422
    detail = "Validation failed."


class ConflictError(AppError):
    status_code = 409
    detail = "Resource already exists."


class AuthenticationError(AppError):
    status_code = 401
    detail = "Authentication required."


class AuthorizationError(AppError):
    status_code = 403
    detail = "Insufficient permissions."


class UploadError(AppError):
    status_code = 422
    detail = "File upload failed."


class OptimizerError(AppError):
    status_code = 500
    detail = "Optimizer execution failed."
