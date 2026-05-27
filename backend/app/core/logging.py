"""
Structured logging configuration for SpendSmart.
"""
from __future__ import annotations

import logging
import sys
from typing import Any

from app.core.config import settings


def configure_logging() -> None:
    """Configure application-wide logging."""
    level = logging.DEBUG if settings.debug else logging.INFO
    fmt = (
        "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s"
        if settings.debug
        else "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )
    logging.basicConfig(
        level=level,
        format=fmt,
        datefmt="%Y-%m-%dT%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    # Suppress noisy third-party loggers
    for logger_name in ("uvicorn.access", "passlib", "multipart"):
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger."""
    return logging.getLogger(name)
