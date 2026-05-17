from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/data-collector", tags=["data-collector"])


@router.post("/collect")
async def collect(request: Request):
    data = await request.json()
    payload = {"input": {"ericsson-data-collector-adp:profile": data["profile"]}}
    job = await execute_command(
        command_args=["data-collector", "collect"],
        operation="data-collector-collect",
        input_payload={"profile": data["profile"]},
        stdin_json=payload,
        cli="bamctl",
    )
    return {"status": job.status, "job": job.model_dump()}
