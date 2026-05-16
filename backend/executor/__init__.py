import asyncio
import json
import uuid
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable

from backend.models.schemas import Job, JobStatus
from backend.storage import save_job, get_state, set_state

BEAMCTL_PATH = "/usr/local/bin/beamctl"
BAMCTL_PATH = "/usr/local/bin/bamctl"


def get_cli_path(cli: str = "beamctl") -> str:
    state = get_state("setup")
    if cli == "bamctl":
        if state and state.get("bamctl_path"):
            return state["bamctl_path"]
        return BAMCTL_PATH
    if state and state.get("beamctl_path"):
        return state["beamctl_path"]
    return BEAMCTL_PATH


async def execute_command(
    command_args: list[str],
    operation: str,
    input_payload: Optional[dict] = None,
    stdin_json: Optional[dict] = None,
    on_output: Optional[Callable[[str], None]] = None,
    cli: str = "beamctl",
) -> Job:
    job_id = str(uuid.uuid4())
    cli_path = get_cli_path(cli)
    full_command = [cli_path] + command_args

    job = Job(
        id=job_id,
        command=" ".join(full_command),
        status=JobStatus.RUNNING,
        operation=operation,
        input_payload=input_payload,
    )
    save_job(job.model_dump())

    try:
        stdin_data = None
        temp_file = None

        if stdin_json:
            temp_file = tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            )
            json.dump(stdin_json, temp_file)
            temp_file.close()
            # Use shell redirection via stdin
            stdin_data = json.dumps(stdin_json).encode()

        process = await asyncio.create_subprocess_exec(
            *full_command,
            stdin=asyncio.subprocess.PIPE if stdin_data else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout_lines = []
        stderr_lines = []

        if stdin_data:
            process.stdin.write(stdin_data)
            await process.stdin.drain()
            process.stdin.close()

        # Read stdout
        async for line in process.stdout:
            decoded = line.decode("utf-8", errors="replace")
            stdout_lines.append(decoded)
            if on_output:
                on_output(decoded)

        # Read stderr
        async for line in process.stderr:
            decoded = line.decode("utf-8", errors="replace")
            stderr_lines.append(decoded)
            if on_output:
                on_output(f"[STDERR] {decoded}")

        await process.wait()

        job.stdout = "".join(stdout_lines)
        job.stderr = "".join(stderr_lines)
        job.status = JobStatus.SUCCESS if process.returncode == 0 else JobStatus.FAILED
        job.completed_at = datetime.utcnow().isoformat()

        # Cleanup temp file
        if temp_file:
            Path(temp_file.name).unlink(missing_ok=True)

    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()

    save_job(job.model_dump())
    return job


async def execute_nrf_command(
    sub_command: str,
    args: list[str] = None,
    stdin_json: Optional[dict] = None,
    operation: str = "",
    input_payload: Optional[dict] = None,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    command_args = ["nrf-config", sub_command]
    if args:
        command_args.extend(args)
    return await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
        on_output=on_output,
    )


async def execute_nf_profile_command(
    sub_command: str,
    args: list[str] = None,
    stdin_json: Optional[dict] = None,
    operation: str = "",
    input_payload: Optional[dict] = None,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    command_args = ["nf-profile-config", sub_command]
    if args:
        command_args.extend(args)
    return await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
        on_output=on_output,
    )


async def execute_login(username: str, password: str, iam_url: str) -> Job:
    """Execute beamctl login command."""
    command_args = [
        "login",
        "-u", username,
        "-p", password,
        "-t", iam_url,
    ]
    return await execute_command(
        command_args=command_args,
        operation="login",
    )


async def execute_config_set(key: str, value: str) -> Job:
    """Execute beamctl config set-config."""
    command_args = ["config", "set-config", "--key", key, "--value", value]
    return await execute_command(
        command_args=command_args,
        operation=f"config-set-{key}",
    )


async def download_beamctl(fqdn: str, target_path: str = BEAMCTL_PATH) -> Job:
    """Download beamctl binary from the BEAM CLI server."""
    command_args = ["curl", "-kO", f"https://{fqdn}/images/linux/beamctl", "-o", target_path]
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=" ".join(command_args),
        status=JobStatus.RUNNING,
        operation="download-beamctl",
    )
    save_job(job.model_dump())

    try:
        process = await asyncio.create_subprocess_exec(
            *command_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        job.stdout = stdout.decode("utf-8", errors="replace")
        job.stderr = stderr.decode("utf-8", errors="replace")

        if process.returncode == 0:
            # Make executable
            chmod_proc = await asyncio.create_subprocess_exec(
                "chmod", "750", target_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await chmod_proc.wait()
            job.status = JobStatus.SUCCESS
        else:
            job.status = JobStatus.FAILED

        job.completed_at = datetime.utcnow().isoformat()
    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()

    save_job(job.model_dump())
    return job
