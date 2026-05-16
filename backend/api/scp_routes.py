from fastapi import APIRouter, Request
from backend.executor import execute_command
from backend.services.cert_service import put_trusted_certificates, install_asymmetric_keys_pkcs12

router = APIRouter(prefix="/api/scp", tags=["scp"])


async def _run_scp(command_args: list, operation: str, input_payload: dict = None, stdin_json=None):
    job = await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
    )
    return {"status": job.status, "job": job.model_dump()}


# --- SCP Server Config ---

@router.get("/servers")
async def list_scp_servers(appgroup: str = None):
    args = ["scp-config", "list-scp-servers"]
    if appgroup:
        args.append(f"--appgroup={appgroup}")
    return await _run_scp(args, operation="scp-list-servers")


@router.get("/servers/{server_id}")
async def get_scp_server(server_id: str):
    return await _run_scp(
        ["scp-config", "get-scp-server", server_id],
        operation="scp-get-server",
        input_payload={"id": server_id},
    )


@router.post("/servers")
async def add_scp_server(request: Request):
    data = await request.json()
    return await _run_scp(
        ["scp-config", "add-scp-server"],
        operation="scp-add-server",
        input_payload=data,
        stdin_json=data,
    )


@router.delete("/servers/{server_id}")
async def delete_scp_server(server_id: str):
    return await _run_scp(
        ["scp-config", "delete-scp-server", server_id],
        operation="scp-delete-server",
        input_payload={"id": server_id},
    )


# --- SCP App Config ---

@router.get("/app-config")
async def list_scp_app_config():
    return await _run_scp(["scp-app-config", "list-scp-app-config"], operation="scp-list-app-config")


@router.get("/app-config/{app_group}")
async def get_scp_app_config(app_group: str):
    return await _run_scp(
        ["scp-app-config", "get-scp-app-config", app_group],
        operation="scp-get-app-config",
        input_payload={"appGroup": app_group},
    )


@router.post("/app-config")
async def add_scp_app_config(request: Request):
    data = await request.json()
    return await _run_scp(
        ["scp-app-config", "add-scp-app-config"],
        operation="scp-add-app-config",
        input_payload=data,
        stdin_json=data,
    )


@router.delete("/app-config/{app_group}")
async def delete_scp_app_config(app_group: str):
    return await _run_scp(
        ["scp-app-config", "delete-scp-app-config", app_group],
        operation="scp-delete-app-config",
        input_payload={"appGroup": app_group},
    )


# --- TLS (reuses cert_service, same as NRF integration) ---

@router.post("/install-sbi-cert")
async def install_sbi_cert(request: Request):
    """Install CHA SBI asymmetric key (p12) — same as NRF TLS flow."""
    data = await request.json()
    job = await install_asymmetric_keys_pkcs12(
        name=data.get("name", "cha-sbi-key"),
        certificate_name=data.get("certificateName", "cha-sbi-cert"),
        p12_base64=data["p12"],
        p12_password=data["p12Password"],
    )
    return {"status": job.status, "job": job.model_dump()}


@router.post("/trust-scp-ca")
async def trust_scp_ca(request: Request):
    """Add SCP CA to external-trusted-ca-list — same as NRF TLS flow."""
    data = await request.json()
    job = await put_trusted_certificates(
        trust_list_name=data.get("trustListName", "external-trusted-ca-list"),
        certificates=data["certificates"],
        description=data.get("description", "Trusted SCP CA for CHA SBI"),
    )
    return {"status": job.status, "job": job.model_dump()}
