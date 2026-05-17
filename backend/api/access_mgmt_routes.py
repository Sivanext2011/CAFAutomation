from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/access-mgmt", tags=["access-management"])


async def _run(command_args: list, operation: str, input_payload: dict = None, stdin_json=None, stdin_text: str = None):
    """Run bamctl access-management commands."""
    import asyncio
    import uuid
    from datetime import datetime
    from backend.models.schemas import Job, JobStatus
    from backend.storage import save_job
    from backend.executor import get_cli_path

    cli_path = get_cli_path("bamctl")
    full_command = [cli_path] + command_args

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=" ".join(full_command),
        status=JobStatus.RUNNING,
        operation=operation,
        input_payload=input_payload,
    )
    save_job(job.model_dump())

    try:
        import json
        stdin_data = None
        if stdin_json:
            stdin_data = json.dumps(stdin_json).encode()
        elif stdin_text:
            stdin_data = stdin_text.encode()

        process = await asyncio.create_subprocess_exec(
            *full_command,
            stdin=asyncio.subprocess.PIPE if stdin_data else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        if stdin_data:
            stdout, stderr = await process.communicate(input=stdin_data)
        else:
            stdout, stderr = await process.communicate()

        job.stdout = stdout.decode("utf-8", errors="replace")
        job.stderr = stderr.decode("utf-8", errors="replace")
        job.status = JobStatus.SUCCESS if process.returncode == 0 else JobStatus.FAILED
        job.completed_at = datetime.utcnow().isoformat()
    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()

    save_job(job.model_dump())
    return {"status": job.status, "job": job.model_dump()}


@router.post("/reset-password")
async def reset_password(request: Request):
    data = await request.json()
    payload = {"oldPassword": data["oldPassword"], "newPassword": data["newPassword"]}
    return await _run(
        ["access-management", "reset-password", data.get("realm", "master")],
        operation="access-mgmt-reset-password",
        input_payload={"realm": data.get("realm", "master")},
        stdin_json=payload,
    )


@router.get("/legal-warning")
async def get_legal_warning():
    return await _run(
        ["access-management", "get-legal-warning"],
        operation="access-mgmt-get-legal-warning",
    )


@router.post("/legal-warning")
async def update_legal_warning(request: Request):
    data = await request.json()
    text = data.get("text", "")
    return await _run(
        ["access-management", "update-legal-warning"],
        operation="access-mgmt-update-legal-warning",
        input_payload={"text": text[:50] + "..." if len(text) > 50 else text},
        stdin_text=text if text else None,
    )


@router.get("/privacy-notice")
async def get_privacy_notice():
    return await _run(
        ["access-management", "get-privacy-notice"],
        operation="access-mgmt-get-privacy-notice",
    )


@router.post("/privacy-notice")
async def update_privacy_notice(request: Request):
    data = await request.json()
    text = data.get("text", "")
    return await _run(
        ["access-management", "update-privacy-notice"],
        operation="access-mgmt-update-privacy-notice",
        input_payload={"text": text[:50] + "..." if len(text) > 50 else text},
        stdin_text=text if text else None,
    )


@router.post("/export-realm")
async def export_realm(request: Request):
    data = await request.json()
    return await _run(
        ["access-management", "export-realm-configuration", data["realm"]],
        operation="access-mgmt-export-realm",
        input_payload={"realm": data["realm"]},
    )


@router.post("/import-realm")
async def import_realm(request: Request):
    data = await request.json()
    args = ["access-management", "import-realm-configuration", data["realm"]]
    if data.get("configMapName"):
        args.extend(["--config-map-name", data["configMapName"]])
    return await _run(
        args,
        operation="access-mgmt-import-realm",
        input_payload={"realm": data["realm"], "configMapName": data.get("configMapName")},
        stdin_json=data.get("realmConfig"),
    )
