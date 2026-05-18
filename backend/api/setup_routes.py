from fastapi import APIRouter, HTTPException, Request, Response
from backend.models.schemas import SetupConfig, LoginRequest
from backend.services.setup_service import (
    perform_cluster_setup,
    perform_login,
    redownload_all_clis,
    get_setup_status,
)
from backend.services.session_service import get_session_info, list_active_sessions, delete_session

router = APIRouter(prefix="/api/setup", tags=["setup"])


@router.get("/status")
async def setup_status(request: Request):
    status = get_setup_status()
    # Include session info if session cookie present
    session_id = request.cookies.get("session_id") or request.headers.get("x-session-id")
    if session_id:
        info = get_session_info(session_id)
        if info:
            status["logged_in"] = True
            status["username"] = info.get("username")
            status["session_id"] = session_id
        else:
            status["logged_in"] = False
    else:
        status["logged_in"] = False
    return status


@router.post("/initialize")
async def initialize_setup(config: SetupConfig):
    try:
        result = await perform_cluster_setup(config)
        return {"status": "success", "result": result}
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(request: LoginRequest, response: Response):
    try:
        result = await perform_login(request)
        if result["status"] == "success":
            # Set session cookie
            response.set_cookie(
                key="session_id",
                value=result["session_id"],
                httponly=False,  # Frontend needs to read it
                samesite="lax",
                max_age=86400,  # 24 hours
            )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id") or request.headers.get("x-session-id")
    if session_id:
        delete_session(session_id)
        response.delete_cookie("session_id")
    return {"status": "success"}


@router.post("/redownload-all")
async def redownload_all():
    try:
        result = await redownload_all_clis()
        return {"status": "success", "result": result}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions")
async def get_sessions():
    """List active sessions (admin view)."""
    return {"sessions": list_active_sessions()}
