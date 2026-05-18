from fastapi import APIRouter, HTTPException, Request
from backend.executor import execute_command
from backend.storage import get_state
from typing import Optional

router = APIRouter(prefix="/api/sdp", tags=["sdp"])


async def _run_external_rating(sub_command: str, stdin_json=None, operation: str = ""):
    command_args = ["external-rating", sub_command]
    job = await execute_command(
        command_args=command_args,
        operation=operation or f"external-rating-{sub_command}",
        input_payload=stdin_json if isinstance(stdin_json, dict) else {"data": stdin_json},
        stdin_json=stdin_json,
    )
    return {"status": job.status, "job": job.model_dump()}


@router.get("/realms")
async def list_realms():
    return await _run_external_rating("list-realms", operation="sdp-list-realms")


@router.post("/realms")
async def update_realms(request: Request):
    """Update external rating realms (replaces entire list)."""
    payload = await request.json()
    return await _run_external_rating("update-realms", stdin_json=payload, operation="sdp-update-realms")


@router.get("/peers")
async def list_peers():
    return await _run_external_rating("list-peers", operation="sdp-list-peers")


@router.post("/peers")
async def update_peers(request: Request):
    """Update external rating peers (replaces entire list)."""
    payload = await request.json()
    return await _run_external_rating("update-peers", stdin_json=payload, operation="sdp-update-peers")


@router.post("/check-peer-status")
async def check_peer_status(data: dict):
    """Check Diameter link status using client peerlist command."""
    setup = get_state("setup")
    if not setup:
        raise HTTPException(status_code=400, detail="Setup not complete")

    namespace = data.get("namespace") or setup.get("namespace", "caf")
    kubeconfig = data.get("kubeconfig_path") or setup.get("kubeconfig_path", "")

    from backend.models.schemas import Job, JobStatus
    import asyncio
    import uuid
    from datetime import datetime
    from backend.storage import save_job

    kube_args = ["kubectl"]
    if kubeconfig:
        kube_args.extend(["--kubeconfig", kubeconfig])

    exec_args = kube_args + [
        "-n", namespace, "exec", "-it", "eric-bss-cha-diameter-lb-0", "--",
        "client", "peerlist",
    ]

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=" ".join(exec_args),
        status=JobStatus.RUNNING,
        operation="sdp-check-peer-status",
        input_payload={"namespace": namespace},
    )
    save_job(job.model_dump())

    try:
        proc = await asyncio.create_subprocess_exec(
            *exec_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        job.stdout = stdout.decode("utf-8", errors="replace")
        job.stderr = stderr.decode("utf-8", errors="replace")
        job.status = JobStatus.SUCCESS if proc.returncode == 0 else JobStatus.FAILED
        job.completed_at = datetime.utcnow().isoformat()
    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()

    save_job(job.model_dump())
    return {"status": job.status, "job": job.model_dump()}
