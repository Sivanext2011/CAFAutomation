from fastapi import APIRouter, Request
from backend.api.enm_routes import push_to_git as _git_push_logic

router = APIRouter(prefix="/api/syslog", tags=["syslog"])


@router.post("/generate-config")
async def generate_syslog_config(request: Request):
    """Generate eric-log-transformer syslog egress YAML."""
    data = await request.json()
    host = data["host"]
    port = data.get("port", "514")
    protocol = data.get("protocol", "udp")
    tls_enabled = data.get("tlsEnabled", False)
    trust_list = data.get("trustListName", "syslog-ca-list")
    inclusions = data.get("inclusions", [])

    yaml_lines = [
        "eric-log-transformer:",
        "  egress:",
        "    syslog:",
        "      enabled: true",
        "      remoteHosts:",
        f"        - host: \"{host}\"",
        f"          port: {port}",
        f"          protocol: \"{protocol}\"",
    ]

    if tls_enabled:
        yaml_lines.extend([
            "      tls:",
            "        enabled: true",
            "        certificates:",
            f"          trustedCertificateListName: \"{trust_list}\"",
        ])

    if inclusions:
        yaml_lines.append("      inclusions:")
        for inc in inclusions:
            yaml_lines.append(f"        - field: \"{inc.get('field', 'log_type')}\"")
            yaml_lines.append(f"          value: \"{inc.get('value', '')}\"")

    yaml_content = "\n".join(yaml_lines) + "\n"
    return {"status": "success", "yaml": yaml_content, "filename": "z_eric-log-transformer-syslog.yaml"}


@router.post("/push-to-git")
async def push_to_git(request: Request):
    """Reuse ENM git push logic."""
    from backend.api.enm_routes import push_to_git
    return await push_to_git(request)
