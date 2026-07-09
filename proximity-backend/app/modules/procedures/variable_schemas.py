from typing import Optional

from pydantic import BaseModel, Field


class VariableCreateRequest(BaseModel):
    scope: str = Field(default="Input")
    name: str
    type: str = Field(default="string")
    required: bool = False
    default_value: Optional[str] = None
    description: Optional[str] = None


class VariableUpdateRequest(BaseModel):
    scope: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    default_value: Optional[str] = None
    description: Optional[str] = None
