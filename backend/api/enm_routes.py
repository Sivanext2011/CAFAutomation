from fastapi import APIRouter, Request
from backend.executor import execute_command
from backend.models.schemas import Job, JobStatus
from backend.storage import save_job
import uuid
import asyncio
from datetime import datetime

router = APIRouter(prefix="/api/enm", tags=["enm-integration"])


@router.post("/generate-snmp-config")
async def generate_snmp_config(request: Request):
    """Generate SNMP alarm provider YAML config for ENM integration."""
    data = await request.json()
    version = data.get("version", "v2c")
    oam_ip = data["oamIngressIp"]
    enm_vip = data["enmFmVip"]
    enm_port = data.get("enmPort", "162")

    yaml_lines = [
        "eric-fh-snmp-alarm-provider:",
        f"  sourceIdentifier: \"{oam_ip}\"",
        "  service:",
        "    snmpTrapConfig:",
        "      trapTargets:",
        f"        - address: \"{enm_vip}\"",
        f"          port: {enm_port}",
    ]

    if version == "v2c":
        community = data.get("community", "public")
        yaml_lines.extend([
            "          version: \"v2c\"",
            f"          community: \"{community}\"",
        ])
    elif version == "v3":
        yaml_lines.extend([
            "          version: \"v3\"",
            f"          userName: \"{data.get('userName', '')}\"",
            f"          securityLevel: \"{data.get('securityLevel', 'authPriv')}\"",
        ])
        if data.get("securityLevel") in ("authNoPriv", "authPriv"):
            yaml_lines.append(f"          authProtocol: \"{data.get('authProtocol', 'SHA')}\"")
            yaml_lines.append(f"          authPassword: \"{data.get('authPassword', '')}\"")
        if data.get("securityLevel") == "authPriv":
            yaml_lines.append(f"          privProtocol: \"{data.get('privProtocol', 'AES')}\"")
            yaml_lines.append(f"          privPassword: \"{data.get('privPassword', '')}\"")

    yaml_content = "\n".join(yaml_lines) + "\n"
    return {"status": "success", "yaml": yaml_content, "filename": "z_eric-fh-snmp-alarm-provider.yaml"}


@router.post("/push-to-git")
async def push_to_git(request: Request):
    """Push generated YAML to a Git repository."""
    data = await request.json()
    repo_url = data["repoUrl"]
    branch = data.get("branch", "main")
    file_path = data.get("filePath", "config/z_eric-fh-snmp-alarm-provider.yaml")
    yaml_content = data["yamlContent"]
    commit_msg = data.get("commitMessage", "feat: add SNMP alarm provider config for ENM integration")
    username = data.get("username", "")
    token = data.get("token", "")

    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        command=f"git push to {repo_url} ({branch}:{file_path})",
        status=JobStatus.RUNNING,
        operation="enm-push-to-git",
        input_payload={"repoUrl": repo_url, "branch": branch, "filePath": file_path},
    )
    save_job(job.model_dump())

    try:
        import tempfile, os, shutil

        tmp_dir = tempfile.mkdtemp()
        # Clone
        clone_url = repo_url
        if username and token:
            # Insert credentials into URL
            if "://" in clone_url:
                proto, rest = clone_url.split("://", 1)
                clone_url = f"{proto}://{username}:{token}@{rest}"

        proc = await asyncio.create_subprocess_exec(
            "git", "clone", "--branch", branch, "--depth", "1", clone_url, tmp_dir,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            job.status = JobStatus.FAILED
            job.stderr = f"Clone failed: {stderr.decode()}"
            job.completed_at = datetime.utcnow().isoformat()
            save_job(job.model_dump())
            return {"status": job.status, "job": job.model_dump()}

        # Write file
        full_path = os.path.join(tmp_dir, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(yaml_content)

        # Git add, commit, push
        cmds = [
            ["git", "-C", tmp_dir, "add", file_path],
            ["git", "-C", tmp_dir, "commit", "-m", commit_msg],
            ["git", "-C", tmp_dir, "push"],
        ]
        all_output = []
        for cmd in cmds:
            p = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            out, err = await p.communicate()
            all_output.append(out.decode() + err.decode())
            if p.returncode != 0:
                job.status = JobStatus.FAILED
                job.stderr = "\n".join(all_output)
                job.completed_at = datetime.utcnow().isoformat()
                save_job(job.model_dump())
                shutil.rmtree(tmp_dir, ignore_errors=True)
                return {"status": job.status, "job": job.model_dump()}

        job.stdout = "\n".join(all_output)
        job.status = JobStatus.SUCCESS
        job.completed_at = datetime.utcnow().isoformat()
        shutil.rmtree(tmp_dir, ignore_errors=True)

    except Exception as e:
        job.status = JobStatus.FAILED
        job.stderr = str(e)
        job.completed_at = datetime.utcnow().isoformat()

    save_job(job.model_dump())
    return {"status": job.status, "job": job.model_dump()}
