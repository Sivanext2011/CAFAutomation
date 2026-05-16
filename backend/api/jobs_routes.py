from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.storage import list_jobs, get_job
from backend.websocket import manager

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("")
async def get_jobs(limit: int = 50):
    jobs = list_jobs(limit=limit)
    return {"jobs": jobs}


@router.get("/{job_id}")
async def get_job_detail(job_id: str):
    job = get_job(job_id)
    if not job:
        return {"error": "Job not found"}, 404
    return {"job": job}


# WebSocket endpoint for live log streaming
ws_router = APIRouter()


@ws_router.websocket("/ws/jobs/{job_id}")
async def websocket_job_logs(websocket: WebSocket, job_id: str):
    await manager.connect(websocket, job_id)
    try:
        while True:
            # Keep connection alive, client can send ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)
