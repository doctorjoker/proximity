from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from .schemas import (
    DeprecateVersionRequest,
    ItemCreate,
    ItemUpdate,
    ProfileCreate,
    ProfileUpdate,
    PublishVersionRequest,
    VersionCreate,
)
from .service import (
    ProvisioningProfileError,
    create_item,
    create_profile,
    create_version,
    delete_item,
    delete_profile,
    deprecate_version,
    get_profile,
    get_version,
    list_configuration_types,
    list_items,
    list_profiles,
    list_versions,
    publish_version,
    update_item,
    update_profile,
)


router = APIRouter(tags=["Provisioning Profiles"])


def _raise_http(exc: ProvisioningProfileError):
    raise HTTPException(
        status_code=exc.status_code,
        detail={"code": exc.code, "message": exc.message},
    )


@router.get("/api/v1/provisioning-configuration-types")
def api_list_configuration_types(active_only: bool = Query(default=True)):
    return {"success": True, "items": list_configuration_types(active_only=active_only)}


@router.get("/api/v1/provisioning-profiles")
def api_list_profiles(
    active: Optional[bool] = Query(default=None),
    technology: Optional[str] = Query(default=None),
):
    return {"success": True, "items": list_profiles(active=active, technology=technology)}


@router.post("/api/v1/provisioning-profiles", status_code=201)
def api_create_profile(payload: ProfileCreate):
    try:
        return {"success": True, "item": create_profile(payload)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.get("/api/v1/provisioning-profiles/{profile_code}")
def api_get_profile(profile_code: str):
    try:
        return {"success": True, "item": get_profile(profile_code)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.patch("/api/v1/provisioning-profiles/{profile_code}")
def api_update_profile(profile_code: str, payload: ProfileUpdate):
    try:
        return {"success": True, "item": update_profile(profile_code, payload)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.delete("/api/v1/provisioning-profiles/{profile_code}")
def api_delete_profile(profile_code: str):
    try:
        return {"success": True, **delete_profile(profile_code)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.get("/api/v1/provisioning-profiles/{profile_code}/versions")
def api_list_versions(profile_code: str):
    try:
        return {"success": True, **list_versions(profile_code)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.post("/api/v1/provisioning-profiles/{profile_code}/versions", status_code=201)
def api_create_version(profile_code: str, payload: VersionCreate):
    try:
        return {"success": True, "item": create_version(profile_code, payload)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.get("/api/v1/provisioning-profile-versions/{version_id}")
def api_get_version(version_id: UUID):
    try:
        return {"success": True, "item": get_version(version_id)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.post("/api/v1/provisioning-profile-versions/{version_id}/publish")
def api_publish_version(version_id: UUID, payload: PublishVersionRequest):
    try:
        return {"success": True, "item": publish_version(version_id, payload)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.post("/api/v1/provisioning-profile-versions/{version_id}/deprecate")
def api_deprecate_version(version_id: UUID, payload: DeprecateVersionRequest):
    try:
        return {"success": True, "item": deprecate_version(version_id, payload)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.get("/api/v1/provisioning-profile-versions/{version_id}/items")
def api_list_items(version_id: UUID):
    try:
        return {"success": True, **list_items(version_id)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.post("/api/v1/provisioning-profile-versions/{version_id}/items", status_code=201)
def api_create_item(version_id: UUID, payload: ItemCreate):
    try:
        return {"success": True, "item": create_item(version_id, payload)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.patch("/api/v1/provisioning-profile-items/{item_id}")
def api_update_item(item_id: UUID, payload: ItemUpdate):
    try:
        return {"success": True, "item": update_item(item_id, payload)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)


@router.delete("/api/v1/provisioning-profile-items/{item_id}")
def api_delete_item(item_id: UUID):
    try:
        return {"success": True, **delete_item(item_id)}
    except ProvisioningProfileError as exc:
        _raise_http(exc)
