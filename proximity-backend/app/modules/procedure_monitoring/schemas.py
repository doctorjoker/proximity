from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ExecutionListResponse(BaseModel):
    success: bool
    items: List[Dict[str, Any]]


class ExecutionDetailResponse(BaseModel):
    success: bool
    item: Dict[str, Any]


class ExecutionTimelineResponse(BaseModel):
    success: bool
    execution: Dict[str, Any]
    items: List[Dict[str, Any]]
    events_count: Optional[int] = 0
    steps_count: Optional[int] = 0
