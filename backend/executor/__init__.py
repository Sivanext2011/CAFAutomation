import asyncio
import json
import os
import uuid
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable

from backend.models.schemas import Job, JobStatus
from backend.storage import save_job, get_state, set_state
from backend.services.session_service import get_session_dir

BIN_DIR = Path(".") / "bin"
BIN_DIR.mkdir(parents=True, exist_ok=True)

BEAMCTL_PATH = str(BIN_DIR / "beamctl")
BAMCTL_PATH = str(BIN_DIR / "bamctl")
KUBECONFIG_PATH = str(BIN_DIR / "kubeconfig")


def get_cli_path(cli: str = "beamctl") -> str:
    if cli == "bamctl":
        return BAMCTL_PATH
    return BEAMCTL_PATH


TOKEN_EXPIRED_MARKERS = [
    "token expired",
    "login expired",
    "unable to get authentication token",
]


def _is_token_expired(output: str) -> bool:
    lower = output.lower()
    return any(m in lower for m in TOKEN_EXPIRED_MARKERS)


def _get_env(session_id: Optional[str] = None) -> dict:
    """Build environment with KUBECONFIG and per-session HOME for CLI tokens."""
    env = os.environ.copy()
    if Path(KUBECONFIG_PATH).exists():
        env["KUBECONFIG"] = str(Path(KUBECONFIG_PATH).resolve())
    # Set HOME to session dir so CLI stores tokens per-user
    if session_id:
        session_dir = get_session_dir(session_id)
        if session_dir:
            env["HOME"] = str(session_dir.resolve())
    return env


async def execute_command(
    command_args: list[str],
    operation: str,
    input_payload: Optional[dict] = None,
    stdin_json: Optional[dict] = None,
    on_output: Optional[Callable[[str], None]] = None,
    cli: str = "beamctl",
    session_id: Optional[str] = None,
) -> Job:
    """Execute a CLI command. If token expired, returns failure (caller must re-login)."""
    return await _execute_command_once(command_args, operation, input_payload, stdin_json, on_output, cli, session_id)


async def _execute_command_once(
    command_args: list[str],
    operation: str,
    input_payload: Optional[dict] = None,
    stdin_json: Optional[dict] = None,
    on_output: Optional[Callable[[str], None]] = None,
    cli: str = "beamctl",
    session_id: Optional[str] = None,
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
            stdin_data = json.dumps(stdin_json).encode()

        env = _get_env(session_id)

        process = await asyncio.create_subprocess_exec(
            *full_command,
            stdin=asyncio.subprocess.PIPE if stdin_data else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        stdout_lines = []
        stderr_lines = []

        if stdin_data:
            process.stdin.write(stdin_data)
            await process.stdin.drain()
            process.stdin.close()

        async for line in process.stdout:
            decoded = line.decode("utf-8", errors="replace")
            stdout_lines.append(decoded)
            if on_output:
                on_output(decoded)

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
    session_id: Optional[str] = None,
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
        session_id=session_id,
    )


async def execute_nf_profile_command(
    sub_command: str,
    args: list[str] = None,
    stdin_json: Optional[dict] = None,
    operation: str = "",
    input_payload: Optional[dict] = None,
    on_output: Optional[Callable[[str], None]] = None,
    session_id: Optional[str] = None,
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
        session_id=session_id,
    )


async def execute_login(username: str, password: str, iam_url: str, session_id: Optional[str] = None) -> Job:
    """Execute beamctl login. Password is written to a temp file and deleted after use."""
    cli_path = get_cli_path("beamctl")

    # Write password to a temp file (deleted after login)
    pass_file = tempfile.NamedTemporaryFile(mode="w", suffix=".pass", delete=False)
    pass_file.write(password)
    pass_file.close()

    full_command = [cli_path, "login", "-u", username, "-p", pass_file.name, "-t", iam_url]

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=" ".join([cli_path, "login", "-u", username, "-p", "***", "-t", iam_url]),
        status=JobStatus.RUNNING,
        operation="login-beamctl",
    )
    save_job(job.model_dump())

    try:
        env = _get_env(session_id)

        process = await asyncio.create_subprocess_exec(
            *full_command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        stdout, stderr = await process.communicate(input=b"yes\n")

        job.stdout = stdout.decode("utf-8", errors="replace")
        job.stderr = stderr.decode("utf-8", errors="replace")
        job.status = JobStatus.SUCCESS if process.returncode == 0 else JobStatus.FAILED
        job.completed_at = datetime.utcnow().isoformat()
    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()
    finally:
        # Always delete password file
        Path(pass_file.name).unlink(missing_ok=True)

    save_job(job.model_dump())
    return job


async def execute_bamctl_login(username: str, password: str, iam_url: str, session_id: Optional[str] = None) -> Job:
    """Execute bamctl login. Password is written to a temp file and deleted after use."""
    cli_path = get_cli_path("bamctl")

    pass_file = tempfile.NamedTemporaryFile(mode="w", suffix=".pass", delete=False)
    pass_file.write(password)
    pass_file.close()

    full_command = [cli_path, "login", "-u", username, "-p", pass_file.name, "-t", iam_url]

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=" ".join([cli_path, "login", "-u", username, "-p", "***", "-t", iam_url]),
        status=JobStatus.RUNNING,
        operation="login-bamctl",
    )
    save_job(job.model_dump())

    try:
        env = _get_env(session_id)

        process = await asyncio.create_subprocess_exec(
            *full_command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        stdout, stderr = await process.communicate(input=b"yes\n")

        job.stdout = stdout.decode("utf-8", errors="replace")
        job.stderr = stderr.decode("utf-8", errors="replace")
        job.status = JobStatus.SUCCESS if process.returncode == 0 else JobStatus.FAILED
        job.completed_at = datetime.utcnow().isoformat()
    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()
    finally:
        Path(pass_file.name).unlink(missing_ok=True)

    save_job(job.model_dump())
    return job


async def execute_config_set(key: str, value: str, session_id: Optional[str] = None) -> Job:
    """Execute beamctl config set-config."""
    command_args = ["config", "set-config", "--key", key, "--value", value]
    return await execute_command(
        command_args=command_args,
        operation=f"config-set-{key}",
        session_id=session_id,
    )


async def download_beamctl(fqdn: str, target_path: str = BEAMCTL_PATH) -> Job:
    """Download beamctl binary from the BEAM CLI server."""
    command_args = ["curl", "-k", f"https://{fqdn}/images/linux/beamctl", "-o", target_path]
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


async def download_bamctl(fqdn: str, target_path: str = BAMCTL_PATH) -> Job:
    """Download bamctl binary from the BAM CLI server."""
    command_args = ["curl", "-k", f"https://{fqdn}/images/linux/bamctl", "-o", target_path]
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=" ".join(command_args),
        status=JobStatus.RUNNING,
        operation="download-bamctl",
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


def save_kubeconfig(content: str):
    """Save kubeconfig content to bin/kubeconfig."""
    Path(KUBECONFIG_PATH).write_text(content)
