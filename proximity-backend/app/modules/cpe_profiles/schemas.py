from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class QualificationRequest(BaseModel):
    persist: bool = True
    profile_code: Optional[str] = None
    notes: Optional[str] = None


class CapabilityEvidence(BaseModel):
    supported: bool
    confidence: int = Field(ge=0, le=100)
    paths: List[str] = []
    note: Optional[str] = None


class QualificationResponse(BaseModel):
    acs_device_id: str
    found: bool
    profile_code: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    product_class: Optional[str] = None
    serial_number: Optional[str] = None
    oui: Optional[str] = None
    hardware_version: Optional[str] = None
    firmware_version: Optional[str] = None
    root_object: Optional[str] = None
    data_model: Optional[str] = None
    device_summary: Optional[str] = None
    capabilities: Dict[str, CapabilityEvidence]
    parameter_mapping: Dict[str, List[str]]
    vendor_extensions: List[str]
    supported_paths_count: int
    qualification_status: str
    persisted: bool = False
    profile_id: Optional[int] = None
    warnings: List[str] = []
    raw_metadata: Dict[str, Any] = {}


class ProfileUpdateRequest(BaseModel):
    qualification_status: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None
    parameter_mapping: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
