from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID

import psycopg2

from . import repository
from .schemas import (
    DeprecateVersionRequest,
    ItemCreate,
    ItemUpdate,
    ProfileCreate,
    ProfileUpdate,
    PublishVersionRequest,
    VersionCreate,
)


class ProvisioningProfileError(Exception):
    status_code = 400
    code = "PROVISIONING_PROFILE_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(ProvisioningProfileError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(ProvisioningProfileError):
    status_code = 409
    code = "CONFLICT"


class ValidationError(ProvisioningProfileError):
    status_code = 422
    code = "VALIDATION_ERROR"


def _model_data(model, *, exclude_unset: bool = False) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=exclude_unset)
    return model.dict(exclude_unset=exclude_unset)


def list_configuration_types(active_only: bool = True):
    return repository.list_configuration_types(active_only=active_only)


def list_profiles(*, active: Optional[bool] = None, technology: Optional[str] = None):
    technology = technology.strip().upper() if technology else None
    return repository.list_profiles(active=active, technology=technology)


def get_profile(profile_code: str):
    item = repository.get_profile(profile_code.strip().upper())
    if not item:
        raise NotFoundError("Provisioning profile not found")
    return item


def create_profile(payload: ProfileCreate):
    data = _model_data(payload)
    try:
        return repository.create_profile(data)
    except psycopg2.errors.UniqueViolation as exc:
        raise ConflictError(f"Profile '{data['profile_code']}' already exists") from exc


def update_profile(profile_code: str, payload: ProfileUpdate):
    code = profile_code.strip().upper()
    get_profile(code)
    return repository.update_profile(code, _model_data(payload, exclude_unset=True))


def delete_profile(profile_code: str):
    profile = get_profile(profile_code)
    if repository.count_profile_assignments(profile["id"]) > 0:
        raise ConflictError("Profile cannot be deleted because it has assignment history")
    if repository.count_non_draft_versions(profile["id"]) > 0:
        raise ConflictError("Profile cannot be deleted because it has non-draft versions")
    if not repository.delete_profile(profile["id"]):
        raise NotFoundError("Provisioning profile not found")
    return {"deleted": True, "profile_code": profile["profile_code"]}


def list_versions(profile_code: str):
    profile = get_profile(profile_code)
    return {"profile": profile, "items": repository.list_versions(profile["id"])}


def get_version(version_id: UUID):
    item = repository.get_version(version_id)
    if not item:
        raise NotFoundError("Provisioning profile version not found")
    return item


def create_version(profile_code: str, payload: VersionCreate):
    profile = get_profile(profile_code)
    data = _model_data(payload)
    if bool(data.get("procedure_code")) != bool(data.get("procedure_version")):
        raise ValidationError("procedure_code and procedure_version must be supplied together")
    if data.get("procedure_code") and not repository.procedure_version_exists(
        data["procedure_code"], data["procedure_version"]
    ):
        raise ValidationError(
            f"Procedure {data['procedure_code']} version {data['procedure_version']} does not exist"
        )
    if repository.get_version_by_number(profile["id"], data["version"]):
        raise ConflictError(
            f"Version {data['version']} already exists for profile {profile['profile_code']}"
        )
    try:
        return repository.create_version(profile["id"], data)
    except psycopg2.errors.UniqueViolation as exc:
        raise ConflictError("Provisioning profile version already exists") from exc


def publish_version(version_id: UUID, payload: PublishVersionRequest):
    version = get_version(version_id)
    if version["status"] == "DEPRECATED":
        raise ConflictError("A deprecated version cannot be published")
    if not version["profile_active"]:
        raise ConflictError("An inactive profile cannot publish a version")
    if int(version["enabled_item_count"]) == 0:
        raise ValidationError("At least one enabled configuration item is required")
    if version.get("procedure_code") and not repository.procedure_version_exists(
        version["procedure_code"], version["procedure_version"]
    ):
        raise ValidationError("Referenced procedure version no longer exists")
    return repository.publish_version(
        version_id,
        published_by=payload.published_by,
        make_current=payload.make_current,
    )


def deprecate_version(version_id: UUID, payload: DeprecateVersionRequest):
    version = get_version(version_id)
    if version["status"] == "DRAFT":
        raise ConflictError("A draft version cannot be deprecated")
    if version["status"] == "DEPRECATED":
        return version
    if payload.replacement_version is not None:
        replacement = repository.get_version_by_number(
            version["profile_id"], payload.replacement_version
        )
        if not replacement:
            raise ValidationError("Replacement version does not exist")
        if replacement["status"] != "PUBLISHED":
            raise ValidationError("Replacement version must be published")
        if replacement["id"] == version["id"]:
            raise ValidationError("Replacement version must be different")
    return repository.deprecate_version(
        version_id,
        deprecated_by=payload.deprecated_by,
        replacement_version=payload.replacement_version,
    )


def list_items(version_id: UUID):
    version = get_version(version_id)
    return {"version": version, "items": repository.list_items(version_id)}


def create_item(version_id: UUID, payload: ItemCreate):
    version = get_version(version_id)
    if version["status"] != "DRAFT":
        raise ConflictError("Items can only be added to a DRAFT version")
    data = _model_data(payload)
    config_type = repository.get_configuration_type(data["configuration_type_code"])
    if not config_type:
        raise ValidationError("Unknown configuration type")
    if not config_type["active"]:
        raise ValidationError("Configuration type is inactive")
    try:
        return repository.create_item(version_id, data)
    except psycopg2.errors.UniqueViolation as exc:
        raise ConflictError(
            "An item with the same code or configuration key already exists"
        ) from exc
    except psycopg2.errors.ForeignKeyViolation as exc:
        raise ValidationError("Invalid configuration type") from exc


def update_item(item_id: UUID, payload: ItemUpdate):
    item = repository.get_item(item_id)
    if not item:
        raise NotFoundError("Provisioning profile item not found")
    if item["version_status"] != "DRAFT":
        raise ConflictError("Items can only be changed in a DRAFT version")
    changes = _model_data(payload, exclude_unset=True)
    if changes.get("configuration_type_code"):
        config_type = repository.get_configuration_type(changes["configuration_type_code"])
        if not config_type or not config_type["active"]:
            raise ValidationError("Unknown or inactive configuration type")
    try:
        return repository.update_item(item_id, changes)
    except psycopg2.errors.UniqueViolation as exc:
        raise ConflictError("Duplicate configuration key") from exc


def delete_item(item_id: UUID):
    item = repository.get_item(item_id)
    if not item:
        raise NotFoundError("Provisioning profile item not found")
    if item["version_status"] != "DRAFT":
        raise ConflictError("Items can only be deleted from a DRAFT version")
    repository.delete_item(item_id)
    return {"deleted": True, "item_id": str(item_id)}
