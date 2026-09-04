"""Standardized API response schemas for consistent pagination, errors, and success responses."""

from __future__ import annotations
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Pagination metadata returned with every paginated response."""
    total: int = Field(description="Total number of records matching the query")
    page: int = Field(description="Current page number (1-indexed)")
    page_size: int = Field(description="Number of records per page")
    total_pages: int = Field(description="Total number of pages")

    @classmethod
    def from_total(cls, total: int, page: int, page_size: int) -> "PaginationMeta":
        total_pages = max(1, (total + page_size - 1) // page_size)
        return cls(total=total, page=page, page_size=page_size, total_pages=total_pages)


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated API response wrapping any list of items."""
    items: list[T] = Field(description="List of items for the current page")
    pagination: PaginationMeta


class SuccessResponse(BaseModel):
    """Standard success response for mutations (create, update, delete)."""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Any = None


class ErrorResponse(BaseModel):
    """Standard error response for all API errors."""
    success: bool = False
    error: str
    detail: str | None = None
    request_id: str | None = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "1.0.0"


def paginate(items: list[Any], page: int = 1, page_size: int = 50) -> dict:
    """Helper to paginate a list of items (dict or Pydantic model) into a PaginatedResponse shape."""
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    # Convert Pydantic models to dicts for JSON serialization
    serialized = []
    for item in page_items:
        if hasattr(item, "model_dump"):
            serialized.append(item.model_dump())
        elif hasattr(item, "dict"):
            serialized.append(item.dict())
        else:
            serialized.append(item)

    return {
        "items": serialized,
        "pagination": PaginationMeta.from_total(total, page, page_size).model_dump(),
    }


def parse_pagination(page: int = 1, page_size: int = 50) -> tuple[int, int]:
    """Parse and validate pagination parameters with sensible defaults and limits."""
    page = max(1, page)
    page_size = max(1, min(200, page_size))
    return page, page_size
