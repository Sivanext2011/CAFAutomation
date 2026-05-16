from backend.models.schemas import (
    AddNrfServerRequest,
    AddNrfOauthServerRequest,
    UpdateRegistrationPropertiesRequest,
    UpdateNfProfileConfigRequest,
    NrfDeploymentRequest,
    Job,
)
from backend.executor import (
    execute_nrf_command,
    execute_nf_profile_command,
)
from backend.validators import validate_address, validate_server_id, validate_address_scheme
from typing import Optional, Callable


async def add_nrf_server(
    request: AddNrfServerRequest,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    error = validate_address(request.address)
    if error:
        raise ValueError(error)
    scheme_error = validate_address_scheme(request.address, request.secured)
    if scheme_error:
        raise ValueError(scheme_error)

    payload = request.to_beamctl_json()
    return await execute_nrf_command(
        sub_command="add-nrf-server",
        stdin_json=payload,
        operation="add-nrf-server",
        input_payload=payload,
        on_output=on_output,
    )


async def delete_nrf_server(
    server_id: str,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    error = validate_server_id(server_id)
    if error:
        raise ValueError(error)

    return await execute_nrf_command(
        sub_command="delete-nrf-server",
        args=[server_id],
        operation="delete-nrf-server",
        input_payload={"serverId": server_id},
        on_output=on_output,
    )


async def get_nrf_server(
    server_id: str,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    error = validate_server_id(server_id)
    if error:
        raise ValueError(error)

    return await execute_nrf_command(
        sub_command="get-nrf-server",
        args=[server_id],
        operation="get-nrf-server",
        input_payload={"serverId": server_id},
        on_output=on_output,
    )


async def list_nrf_servers(
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    return await execute_nrf_command(
        sub_command="list-nrf-servers",
        operation="list-nrf-servers",
        on_output=on_output,
    )


async def add_nrf_oauth_server(
    request: AddNrfOauthServerRequest,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    error = validate_address(request.address)
    if error:
        raise ValueError(error)
    scheme_error = validate_address_scheme(request.address, request.secured)
    if scheme_error:
        raise ValueError(scheme_error)

    payload = request.to_beamctl_json()
    return await execute_nrf_command(
        sub_command="add-nrf-oauth-server",
        stdin_json=payload,
        operation="add-nrf-oauth-server",
        input_payload=payload,
        on_output=on_output,
    )


# --- Combined Deployment (Scenario-based) ---

async def deploy_nrf_configuration(
    request: NrfDeploymentRequest,
    on_output: Optional[Callable[[str], None]] = None,
) -> dict:
    """Deploy NRF + optional OAuth in one operation based on scenario."""
    results = {"scenario": request.get_scenario(), "steps": []}

    # Validate NRF address scheme
    scheme_error = validate_address_scheme(request.nrf_address, request.nrf_secured)
    if scheme_error:
        raise ValueError(f"NRF: {scheme_error}")

    # Step 1: Add NRF Server
    nrf_payload = request.to_nrf_server_json()
    nrf_job = await execute_nrf_command(
        sub_command="add-nrf-server",
        stdin_json=nrf_payload,
        operation="deploy-nrf-server",
        input_payload=nrf_payload,
        on_output=on_output,
    )
    results["steps"].append({"operation": "add-nrf-server", "job": nrf_job.model_dump()})

    # Step 2: Add OAuth Server (if enabled)
    if request.oauth_enabled and request.oauth_address:
        oauth_scheme_error = validate_address_scheme(request.oauth_address, request.oauth_secured)
        if oauth_scheme_error:
            raise ValueError(f"OAuth: {oauth_scheme_error}")

        oauth_payload = request.to_oauth_server_json()
        oauth_job = await execute_nrf_command(
            sub_command="add-nrf-oauth-server",
            stdin_json=oauth_payload,
            operation="deploy-oauth-server",
            input_payload=oauth_payload,
            on_output=on_output,
        )
        results["steps"].append({"operation": "add-nrf-oauth-server", "job": oauth_job.model_dump()})

    return results


async def delete_nrf_oauth_server(
    server_id: str,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    error = validate_server_id(server_id)
    if error:
        raise ValueError(error)

    return await execute_nrf_command(
        sub_command="delete-nrf-oauth-server",
        args=[server_id],
        operation="delete-nrf-oauth-server",
        input_payload={"serverId": server_id},
        on_output=on_output,
    )


async def get_nrf_oauth_server(
    server_id: str,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    error = validate_server_id(server_id)
    if error:
        raise ValueError(error)

    return await execute_nrf_command(
        sub_command="get-nrf-oauth-server",
        args=[server_id],
        operation="get-nrf-oauth-server",
        input_payload={"serverId": server_id},
        on_output=on_output,
    )


async def list_nrf_oauth_servers(
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    return await execute_nrf_command(
        sub_command="list-nrf-oauth-servers",
        operation="list-nrf-oauth-servers",
        on_output=on_output,
    )


async def list_registration_properties(
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    return await execute_nrf_command(
        sub_command="list-registration-properties",
        operation="list-registration-properties",
        on_output=on_output,
    )


async def update_registration_properties(
    request: UpdateRegistrationPropertiesRequest,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    payload = request.to_beamctl_json()
    return await execute_nrf_command(
        sub_command="update-registration-properties",
        stdin_json=payload,
        operation="update-registration-properties",
        input_payload=payload,
        on_output=on_output,
    )


# --- NF Profile Config ---

async def list_nf_profile_config(
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    return await execute_nf_profile_command(
        sub_command="list-nf-profile-config",
        operation="list-nf-profile-config",
        on_output=on_output,
    )


async def update_nf_profile_config(
    request: UpdateNfProfileConfigRequest,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    return await execute_nf_profile_command(
        sub_command="update-nf-profile-config",
        args=[request.app_group_name],
        stdin_json=request.payload,
        operation="update-nf-profile-config",
        input_payload={"appGroupName": request.app_group_name, "payload": request.payload},
        on_output=on_output,
    )


async def delete_nf_profile_config(
    app_group_name: str,
    on_output: Optional[Callable[[str], None]] = None,
) -> Job:
    return await execute_nf_profile_command(
        sub_command="delete-nf-profile-config",
        args=[app_group_name],
        operation="delete-nf-profile-config",
        input_payload={"appGroupName": app_group_name},
        on_output=on_output,
    )
