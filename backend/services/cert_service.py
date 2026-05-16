from backend.executor import execute_command
from backend.models.schemas import Job
from backend.storage import get_state
from typing import Optional, Callable


async def put_trusted_certificates(
    trust_list_name: str,
    certificates: list[dict],
    description: str = "",
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    """Install trusted CA certificates into CertM trust list."""
    setup = get_state("setup")
    certm_fqdn = setup.get("certm_fqdn", "") if setup else ""

    payload = {
        "description": description,
        "certificates": certificates,
    }

    args = [
        "cert-management-v3", "put-trusted-certificates", trust_list_name,
    ]
    if certm_fqdn:
        args.extend(["--server", f"https://{certm_fqdn}"])

    return await execute_command(
        command_args=args,
        operation="put-trusted-certificates",
        input_payload=payload,
        stdin_json=payload,
        on_output=on_output,
        cli="bamctl",
    )


async def install_asymmetric_keys_pkcs12(
    name: str,
    certificate_name: str,
    p12_base64: str,
    p12_password: str,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    """Install asymmetric key pair (PKCS#12) into CertM."""
    setup = get_state("setup")
    certm_fqdn = setup.get("certm_fqdn", "") if setup else ""

    payload = {
        "name": name,
        "certificateName": certificate_name,
        "p12": p12_base64,
        "p12Password": p12_password,
    }

    args = ["cert-management-v3", "install-asymmetric-keys-pkcs12"]
    if certm_fqdn:
        args.extend(["--server", f"https://{certm_fqdn}"])

    return await execute_command(
        command_args=args,
        operation="install-asymmetric-keys-pkcs12",
        input_payload={"name": name, "certificateName": certificate_name},
        stdin_json=payload,
        on_output=on_output,
        cli="bamctl",
    )
