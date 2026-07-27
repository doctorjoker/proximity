from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator


def _upper(value: str) -> str:
    value = value.strip().upper()
    if not value:
        raise ValueError("value cannot be empty")
    return value


class ProfileCreate(BaseModel):
    profile_code: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=180)
    description: Optional[str] = None
    technology: str = Field(min_length=2, max_length=50)
    vendor_scope: Optional[str] = Field(default=None, max_length=120)
    active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("profile_code", "technology")
    @classmethod
    def normalize_upper(cls, value: str) -> str:
        return _upper(value)


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=180)
    description: Optional[str] = None
    technology: Optional[str] = Field(default=None, min_length=2, max_length=50)
    vendor_scope: Optional[str] = Field(default=None, max_length=120)
    active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("technology")
    @classmethod
    def normalize_technology(cls, value: Optional[str]) -> Optional[str]:
        return _upper(value) if value is not None else None


class VersionCreate(BaseModel):
    version: int = Field(ge=1)
    procedure_code: Optional[str] = Field(default=None, max_length=120)
    procedure_version: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[str] = Field(default=None, max_length=120)

    @field_validator("procedure_code")
    @classmethod
    def normalize_procedure_code(cls, value: Optional[str]) -> Optional[str]:
        return _upper(value) if value else value


class PublishVersionRequest(BaseModel):
    published_by: Optional[str] = Field(default=None, max_length=120)
    make_current: bool = True


class DeprecateVersionRequest(BaseModel):
    deprecated_by: Optional[str] = Field(default=None, max_length=120)
    replacement_version: Optional[int] = Field(default=None, ge=1)


class ItemCreate(BaseModel):
    item_code: str = Field(min_length=2, max_length=100)
    configuration_type_code: str = Field(min_length=2, max_length=50)
    configuration_key: str = Field(min_length=1, max_length=100)
    template_payload: Dict[str, Any] = Field(default_factory=dict)
    required: bool = True
    enabled: bool = True
    sort_order: int = Field(default=0, ge=0)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("item_code", "configuration_type_code")
    @classmethod
    def normalize_upper(cls, value: str) -> str:
        return _upper(value)

    @field_validator("configuration_key")
    @classmethod
    def normalize_key(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("configuration_key cannot be empty")
        return value


class ItemUpdate(BaseModel):
    configuration_type_code: Optional[str] = Field(default=None, min_length=2, max_length=50)
    configuration_key: Optional[str] = Field(default=None, min_length=1, max_length=100)
    template_payload: Optional[Dict[str, Any]] = None
    required: Optional[bool] = None
    enabled: Optional[bool] = None
    sort_order: Optional[int] = Field(default=None, ge=0)
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("configuration_type_code")
    @classmethod
    def normalize_type(cls, value: Optional[str]) -> Optional[str]:
        return _upper(value) if value is not None else None

    @field_validator("configuration_key")
    @classmethod
    def normalize_key(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("configuration_key cannot be empty")
        return value
