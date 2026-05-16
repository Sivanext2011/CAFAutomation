"""
Deployment workflow orchestrator.
Chains operations in correct order based on deployment scenario:

Scenario 1: HTTP NRF, No OAuth         → add-nrf-server only
Scenario 2: HTTP NRF, OAuth over HTTP   → add-nrf-server + add-oauth-server
Scenario 3: HTTP NRF, OAuth over HTTPS  → add-nrf-server + trust-oauth-ca + add-oauth-server
Scenario 4: HTTPS NRF, No OAuth         → trust-nrf-ca + (install-sbi-cert) + add-nrf-server
Scenario 5: HTTPS NRF, OAuth over HTTP  → trust-nrf-ca + (install-sbi-cert) + add-nrf-server + add-oauth-server
Scenario 6: HTTPS NRF, OAuth over HTTPS → trust-nrf-ca + trust-oauth-ca + (install-sbi-cert) + add-nrf-server + add-oauth-server
"""

from backend.models.schemas import NrfDeploymentRequest, Job
from backend.executor import execute_nrf_command
from backend.services.cert_service import put_trusted_certificates, install_asymmetric_keys_pkcs12
from backend.validators import validate_address_scheme
from typing import Optional, Callable
from dataclasses import dataclass


@dataclass
class DeploymentStep:
    name: str
    status: str = "pending"
    job: Optional[dict] = None
    skipped: bool = False
    reason: str = ""


async def execute_full_deployment(
    request: NrfDeploymentRequest,
    nrf_ca_certs: Optional[list[dict]] = None,
    oauth_ca_certs: Optional[list[dict]] = None,
    sbi_key: Optional[dict] = None,
    on_output: Optional[Callable[[str], None]] = None,
) -> dict:
    """
    Execute full deployment workflow based on scenario.
    Returns ordered list of steps with results.
    """
    scenario = request.get_scenario()
    steps = []

    # Validate addresses match security flags
    scheme_error = validate_address_scheme(request.nrf_address, request.nrf_secured)
    if scheme_error:
        raise ValueError(f"NRF address: {scheme_error}")

    if request.oauth_enabled and request.oauth_address:
        oauth_scheme_error = validate_address_scheme(request.oauth_address, request.oauth_secured)
        if oauth_scheme_error:
            raise ValueError(f"OAuth address: {oauth_scheme_error}")

    # Step 1: Trust NRF CA (scenarios 4, 5, 6)
    if request.nrf_secured:
        if nrf_ca_certs:
            job = await put_trusted_certificates(
                trust_list_name="external-trusted-ca-list",
                certificates=nrf_ca_certs,
                description="Trusted NRF CAs for SBI",
                on_output=on_output,
            )
            steps.append({"step": "trust-nrf-ca", "status": job.status, "job": job.model_dump()})
        else:
            steps.append({"step": "trust-nrf-ca", "status": "skipped", "reason": "No NRF CA certificates provided"})

    # Step 2: Trust OAuth CA (scenarios 3, 6 — OAuth over HTTPS with separate CA)
    if request.oauth_enabled and request.oauth_secured:
        if oauth_ca_certs:
            job = await put_trusted_certificates(
                trust_list_name="external-trusted-ca-list",
                certificates=oauth_ca_certs,
                description="Trusted OAuth CAs for SBI",
                on_output=on_output,
            )
            steps.append({"step": "trust-oauth-ca", "status": job.status, "job": job.model_dump()})
        else:
            steps.append({"step": "trust-oauth-ca", "status": "skipped", "reason": "No OAuth CA certificates provided (may share NRF CA)"})

    # Step 3: Install SBI key/cert (scenarios 4, 5, 6 — or mTLS)
    if request.nrf_secured or request.mtls:
        if sbi_key:
            job = await install_asymmetric_keys_pkcs12(
                name=sbi_key.get("name", "cha-sbi-key"),
                certificate_name=sbi_key.get("certificateName", "cha-sbi-cert"),
                p12_base64=sbi_key["p12"],
                p12_password=sbi_key["p12Password"],
                on_output=on_output,
            )
            steps.append({"step": "install-sbi-cert", "status": job.status, "job": job.model_dump()})
        else:
            steps.append({"step": "install-sbi-cert", "status": "skipped", "reason": "No SBI key provided"})

    # Step 4: Add NRF Server (all scenarios)
    nrf_payload = request.to_nrf_server_json()
    nrf_job = await execute_nrf_command(
        sub_command="add-nrf-server",
        stdin_json=nrf_payload,
        operation="add-nrf-server",
        input_payload=nrf_payload,
        on_output=on_output,
    )
    steps.append({"step": "add-nrf-server", "status": nrf_job.status, "job": nrf_job.model_dump()})

    # Step 5: Add OAuth Server (scenarios 2, 3, 5, 6)
    if request.oauth_enabled and request.oauth_address:
        oauth_payload = request.to_oauth_server_json()
        oauth_job = await execute_nrf_command(
            sub_command="add-nrf-oauth-server",
            stdin_json=oauth_payload,
            operation="add-nrf-oauth-server",
            input_payload=oauth_payload,
            on_output=on_output,
        )
        steps.append({"step": "add-nrf-oauth-server", "status": oauth_job.status, "job": oauth_job.model_dump()})

    return {
        "scenario": scenario,
        "scenario_description": _scenario_description(scenario),
        "steps": steps,
        "security_profile": {
            "nrf_secured": request.nrf_secured,
            "oauth_enabled": request.oauth_enabled,
            "oauth_secured": request.oauth_secured,
            "mtls": request.mtls,
            "customer_pki": request.customer_pki,
        },
    }


def _scenario_description(scenario: int) -> str:
    descriptions = {
        1: "HTTP NRF, No OAuth — Basic lab setup",
        2: "HTTP NRF, OAuth over HTTP — Fully insecure lab",
        3: "HTTP NRF, OAuth over HTTPS — Common transitional",
        4: "HTTPS NRF, No OAuth — TLS-only deployment",
        5: "HTTPS NRF, OAuth over HTTP — Rare/mixed",
        6: "HTTPS NRF, OAuth over HTTPS — Typical production",
    }
    return descriptions.get(scenario, "Unknown scenario")
