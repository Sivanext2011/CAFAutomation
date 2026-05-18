from fastapi import APIRouter, HTTPException, Request
from backend.models.schemas import (
    AddNrfServerRequest,
    AddNrfOauthServerRequest,
    UpdateRegistrationPropertiesRequest,
    UpdateNfProfileConfigRequest,
    NrfDeploymentRequest,
)
from backend.services import nrf_service

router = APIRouter(prefix="/api/nrf", tags=["nrf"])


def _sid(request: Request) -> str:
    return getattr(request.state, "session_id", None)


@router.post("/servers")
async def add_nrf_server(request: Request, data: AddNrfServerRequest):
    try:
        job = await nrf_service.add_nrf_server(data, session_id=_sid(request))
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/servers/{server_id}")
async def delete_nrf_server(server_id: str, request: Request):
    try:
        job = await nrf_service.delete_nrf_server(server_id, session_id=_sid(request))
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/servers/{server_id}")
async def get_nrf_server(server_id: str, request: Request):
    try:
        job = await nrf_service.get_nrf_server(server_id, session_id=_sid(request))
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/servers")
async def list_nrf_servers(request: Request):
    job = await nrf_service.list_nrf_servers(session_id=_sid(request))
    return {"status": job.status, "job": job.model_dump()}


@router.post("/deploy")
async def deploy_nrf_configuration(request: Request, data: NrfDeploymentRequest):
    try:
        result = await nrf_service.deploy_nrf_configuration(data, session_id=_sid(request))
        failed_steps = [s for s in result.get("steps", []) if s.get("job", {}).get("status") == "failed"]
        status = "failed" if failed_steps else "success"
        return {"status": status, "result": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/oauth-servers")
async def add_nrf_oauth_server(request: Request, data: AddNrfOauthServerRequest):
    try:
        job = await nrf_service.add_nrf_oauth_server(data, session_id=_sid(request))
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/oauth-servers/{server_id}")
async def delete_nrf_oauth_server(server_id: str, request: Request):
    try:
        job = await nrf_service.delete_nrf_oauth_server(server_id, session_id=_sid(request))
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/oauth-servers/{server_id}")
async def get_nrf_oauth_server(server_id: str, request: Request):
    try:
        job = await nrf_service.get_nrf_oauth_server(server_id, session_id=_sid(request))
        return {"status": job.status, "job": job.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/oauth-servers")
async def list_nrf_oauth_servers(request: Request):
    job = await nrf_service.list_nrf_oauth_servers(session_id=_sid(request))
    return {"status": job.status, "job": job.model_dump()}


@router.get("/registration-properties")
async def list_registration_properties(request: Request):
    job = await nrf_service.list_registration_properties(session_id=_sid(request))
    return {"status": job.status, "job": job.model_dump()}


@router.put("/registration-properties")
async def update_registration_properties(request: Request, data: UpdateRegistrationPropertiesRequest):
    job = await nrf_service.update_registration_properties(data, session_id=_sid(request))
    return {"status": job.status, "job": job.model_dump()}


@router.get("/nf-profile")
async def list_nf_profile_config(request: Request):
    job = await nrf_service.list_nf_profile_config(session_id=_sid(request))
    return {"status": job.status, "job": job.model_dump()}


@router.put("/nf-profile/{app_group_name}")
async def update_nf_profile_config(app_group_name: str, request: Request, data: UpdateNfProfileConfigRequest):
    data.app_group_name = app_group_name
    job = await nrf_service.update_nf_profile_config(data, session_id=_sid(request))
    return {"status": job.status, "job": job.model_dump()}


@router.delete("/nf-profile/{app_group_name}")
async def delete_nf_profile_config(app_group_name: str, request: Request):
    job = await nrf_service.delete_nf_profile_config(app_group_name, session_id=_sid(request))
    return {"status": job.status, "job": job.model_dump()}
