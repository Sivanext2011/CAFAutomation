from fastapi import APIRouter, HTTPException
from backend.executor import execute_command
from typing import Optional

router = APIRouter(prefix="/api/sdp", tags=["sdp"])


async def _run_external_rating(sub_command: str, stdin_json=None, operation: str = ""):
    command_args = ["external-rating", sub_command]
    job = await execute_command(
        command_args=command_args,
        operation=operation or f"external-rating-{sub_command}",
        input_payload=stdin_json,
        stdin_json=stdin_json,
    )
    return {"status": job.status, "job": job.model_dump()}


@router.get("/realms")
async def list_realms():
    return await _run_external_rating("list-realms", operation="sdp-list-realms")


@router.post("/realms")
async def update_realms(payload: list):
    """Update external rating realms (replaces entire list)."""
    return await _run_external_rating("update-realms", stdin_json=payload, operation="sdp-update-realms")


@router.get("/peers")
async def list_peers():
    return await _run_external_rating("list-peers", operation="sdp-list-peers")


@router.post("/peers")
async def update_peers(payload: list):
    """Update external rating peers (replaces entire list)."""
    return await _run_external_rating("update-peers", stdin_json=payload, operation="sdp-update-peers")
