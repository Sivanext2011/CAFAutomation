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
    """Check Diameter link status by exec'ing into DLB pod and running ss."""
    setup = get_state("setup")
    if not setup:
        raise HTTPException(status_code=400, detail="Setup not complete")

    namespace = data.get("namespace") or setup.get("namespace", "caf")
    kubeconfig = data.get("kubeconfig_path") or setup.get("kubeconfig_path", "")
    port = data.get("port", "3868")
    transport = data.get("transport", "sctp")

    # Step 1: Get DLB pod name
    kube_args = ["kubectl"]
    if kubeconfig:
        kube_args.extend(["--kubeconfig", kubeconfig])

    get_pod_args = kube_args + [
        "get", "pods", "-n", namespace,
        "-l", "app=eric-bss-cha-diameter-lb",
        "-o", "jsonpath={.items[0].metadata.name}",
    ]

    from backend.models.schemas import Job, JobStatus
    import asyncio
    import uuid
    from datetime import datetime
    from backend.storage import save_job

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=" ".join(get_pod_args),
        status=JobStatus.RUNNING,
        operation="sdp-check-peer-status",
        input_payload={"namespace": namespace, "port": port, "transport": transport},
    )
    save_job(job.model_dump())

    try:
        # Get pod name
        proc = await asyncio.create_subprocess_exec(
            *get_pod_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        pod_name = stdout.decode().strip()

        if proc.returncode != 0 or not pod_name:
            job.status = JobStatus.FAILED
            job.stderr = f"Failed to find DLB pod: {stderr.decode()}"
            job.completed_at = datetime.utcnow().isoformat()
            save_job(job.model_dump())
            return {"status": job.status, "job": job.model_dump()}

        # Step 2: Exec into pod and check sessions
        ss_flag = "-panS" if transport == "sctp" else "-pant"
        exec_args = kube_args + [
            "exec", "-n", namespace, pod_name, "--",
            "bash", "-c", f"ss {ss_flag} | grep {port}",
        ]

        proc2 = await asyncio.create_subprocess_exec(
            *exec_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout2, stderr2 = await proc2.communicate()

        job.command = f"kubectl exec {pod_name} -- ss {ss_flag} | grep {port}"
        job.stdout = f"Pod: {pod_name}\n\n{stdout2.decode()}"
        job.stderr = stderr2.decode() if proc2.returncode != 0 else ""
        job.status = JobStatus.SUCCESS if proc2.returncode == 0 else JobStatus.FAILED
        job.completed_at = datetime.utcnow().isoformat()

    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()

    save_job(job.model_dump())
    return {"status": job.status, "job": job.model_dump()}
