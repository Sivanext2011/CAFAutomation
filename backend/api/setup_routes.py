from fastapi import APIRouter, HTTPException
from backend.models.schemas import SetupConfig, LoginRequest
from backend.services.setup_service import (
    perform_initial_setup,
    perform_login,
    redownload_beamctl,
    redownload_all_clis,
    get_setup_status,
)

router = APIRouter(prefix="/api/setup", tags=["setup"])


@router.get("/status")
async def setup_status():
    return get_setup_status()


@router.post("/initialize")
async def initialize_setup(config: SetupConfig):
    try:
        result = await perform_initial_setup(config)
        return {"status": "success", "result": result}
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(request: LoginRequest):
    try:
        job = await perform_login(request)
        return {"status": job.status, "job": job.model_dump()}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/redownload-beamctl")
async def redownload():
    try:
        job = await redownload_beamctl()
        return {"status": job.status, "job": job.model_dump()}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/redownload-all")
async def redownload_all():
    try:
        result = await redownload_all_clis()
        return {"status": "success", "result": result}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
