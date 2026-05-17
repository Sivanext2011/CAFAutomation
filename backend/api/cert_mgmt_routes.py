from fastapi import APIRouter, Request
from backend.executor import execute_command
from backend.services.cert_service import put_trusted_certificates, install_asymmetric_keys_pkcs12
from backend.storage import get_state, set_state

router = APIRouter(prefix="/api/cert-mgmt", tags=["cert-management"])


async def _run(command_args: list, operation: str, input_payload: dict = None, stdin_json=None):
    job = await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
        cli="bamctl",
    )
    return {"status": job.status, "job": job.model_dump()}


# --- Service Mappings (stored in state) ---

@router.get("/mappings")
async def get_mappings():
    mappings = get_state("cert_mappings")
    return {"mappings": mappings.get("services", []) if mappings else []}


@router.post("/mappings")
async def save_mappings(request: Request):
    data = await request.json()
    set_state("cert_mappings", {"services": data.get("services", [])})
    return {"status": "success"}


# --- Install Asymmetric Key (PKCS12) ---

@router.post("/install-key")
async def install_key(request: Request):
    data = await request.json()
    job = await install_asymmetric_keys_pkcs12(
        name=data["name"],
        certificate_name=data["certificateName"],
        p12_base64=data["p12"],
        p12_password=data["p12Password"],
    )
    return {"status": job.status, "job": job.model_dump()}


# --- Put Trusted Certificates ---

@router.post("/trust-ca")
async def trust_ca(request: Request):
    data = await request.json()
    job = await put_trusted_certificates(
        trust_list_name=data["trustListName"],
        certificates=data["certificates"],
        description=data.get("description", ""),
    )
    return {"status": job.status, "job": job.model_dump()}


# --- List/Get operations ---

@router.get("/keys")
async def list_keys():
    return await _run(["cert-management-v3", "list-all-asymmetric-keys"], "cert-list-keys")


@router.get("/keys/{name}")
async def get_key(name: str):
    return await _run(["cert-management-v3", "get-asymmetric-key", name], "cert-get-key", {"name": name})


@router.delete("/keys/{name}")
async def delete_key(name: str):
    return await _run(["cert-management-v3", "delete-asymmetric-key", name], "cert-delete-key", {"name": name})


@router.get("/trusted")
async def list_trusted():
    return await _run(["cert-management-v3", "list-trusted-certificates"], "cert-list-trusted")


@router.get("/trusted/{name}")
async def get_trusted(name: str):
    return await _run(["cert-management-v3", "get-trusted-certificates", name], "cert-get-trusted", {"name": name})


@router.delete("/trusted/{name}")
async def delete_trusted(name: str):
    return await _run(["cert-management-v3", "delete-trusted-certificates", name], "cert-delete-trusted", {"name": name})


@router.get("/cmp-groups")
async def list_cmp():
    return await _run(["cert-management-v3", "list-cmp-server-groups"], "cert-list-cmp")


@router.get("/crls")
async def list_crls():
    return await _run(["cert-management-v3", "list-crls"], "cert-list-crls")


@router.post("/renew/{name}")
async def renew_key(name: str, request: Request):
    data = await request.json()
    return await _run(["cert-management-v3", "renew-asymmetric-key", name], "cert-renew-key", {"name": name}, stdin_json=data)
