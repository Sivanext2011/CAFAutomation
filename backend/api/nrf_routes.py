from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    AddNrfServerRequest,
    AddNrfOauthServerRequest,
    UpdateRegistrationPropertiesRequest,
    UpdateNfProfileConfigRequest,
    NrfDeploymentRequest,
)
from backend.services import nrf_service

router = APIRouter(prefix="/api/nrf", tags=["nrf"])


# --- NRF Servers ---

@router.post("/servers")
async def add_nrf_server(request: AddNrfServerRequest):
    try:
        job = await nrf_service.add_nrf_server(request)
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/servers/{server_id}")
async def delete_nrf_server(server_id: str):
    try:
        job = await nrf_service.delete_nrf_server(server_id)
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/servers/{server_id}")
async def get_nrf_server(server_id: str):
    try:
        job = await nrf_service.get_nrf_server(server_id)
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/servers")
async def list_nrf_servers():
    job = await nrf_service.list_nrf_servers()
    return {"status": job.status, "job": job.model_dump()}


# --- Combined Deployment (Scenario-based) ---

@router.post("/deploy")
async def deploy_nrf_configuration(request: NrfDeploymentRequest):
    """Deploy NRF + optional OAuth configuration in one operation."""
    try:
        result = await nrf_service.deploy_nrf_configuration(request)
        # Check if any step failed
        failed_steps = [
            s for s in result.get("steps", [])
            if s.get("job", {}).get("status") == "failed"
        ]
        status = "failed" if failed_steps else "success"
        return {"status": status, "result": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# --- NRF OAuth Servers ---

@router.post("/oauth-servers")
async def add_nrf_oauth_server(request: AddNrfOauthServerRequest):
    try:
        job = await nrf_service.add_nrf_oauth_server(request)
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/oauth-servers/{server_id}")
async def delete_nrf_oauth_server(server_id: str):
    try:
        job = await nrf_service.delete_nrf_oauth_server(server_id)
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/oauth-servers/{server_id}")
async def get_nrf_oauth_server(server_id: str):
    try:
        job = await nrf_service.get_nrf_oauth_server(server_id)
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/oauth-servers")
async def list_nrf_oauth_servers():
    job = await nrf_service.list_nrf_oauth_servers()
    return {"status": job.status, "job": job.model_dump()}


# --- Registration Properties ---

@router.get("/registration-properties")
async def list_registration_properties():
    job = await nrf_service.list_registration_properties()
    return {"status": job.status, "job": job.model_dump()}


@router.put("/registration-properties")
async def update_registration_properties(request: UpdateRegistrationPropertiesRequest):
    job = await nrf_service.update_registration_properties(request)
    return {"status": job.status, "job": job.model_dump()}


# --- NF Profile Config ---

@router.get("/nf-profile")
async def list_nf_profile_config():
    job = await nrf_service.list_nf_profile_config()
    return {"status": job.status, "job": job.model_dump()}


@router.put("/nf-profile/{app_group_name}")
async def update_nf_profile_config(app_group_name: str, request: UpdateNfProfileConfigRequest):
    request.app_group_name = app_group_name
    job = await nrf_service.update_nf_profile_config(request)
    return {"status": job.status, "job": job.model_dump()}


@router.delete("/nf-profile/{app_group_name}")
async def delete_nf_profile_config(app_group_name: str):
    job = await nrf_service.delete_nf_profile_config(app_group_name)
    return {"status": job.status, "job": job.model_dump()}
