from backend.models.schemas import SetupConfig, LoginRequest, Job
from backend.executor import execute_login, execute_config_set, download_beamctl
from backend.storage import get_setup_config, save_setup_config, is_setup_complete
from backend.validators import validate_fqdn


async def perform_initial_setup(config: SetupConfig) -> dict:
    """Perform initial setup: download beamctl, configure FQDN."""
    error = validate_fqdn(config.oam_site_domain_name)
    if error:
        raise ValueError(error)

    results = {}

    # Determine BEAM CLI FQDN
    beam_fqdn = config.beam_cli_fqdn or f"eric-bss-beam-cli.{config.oam_site_domain_name}"

    # Download beamctl binary
    download_job = await download_beamctl(beam_fqdn)
    results["download"] = download_job.model_dump()

    if download_job.status != "success":
        raise RuntimeError(f"Failed to download beamctl: {download_job.stderr}")

    # Configure FQDN
    fqdn_job = await execute_config_set("fqdn", config.oam_site_domain_name)
    results["fqdn_config"] = fqdn_job.model_dump()

    if fqdn_job.status != "success":
        raise RuntimeError(f"Failed to configure FQDN: {fqdn_job.stderr}")

    # If custom BEAM CLI FQDN provided, configure it
    if config.beam_cli_fqdn:
        cli_job = await execute_config_set("cli-server", config.beam_cli_fqdn)
        results["cli_server_config"] = cli_job.model_dump()

    # Save setup state
    setup_state = {
        "oam_site_domain_name": config.oam_site_domain_name,
        "beam_cli_fqdn": beam_fqdn,
        "iam_fqdn": config.iam_fqdn or f"eric-sec-access-mgmt.{config.oam_site_domain_name}",
        "certm_fqdn": config.certm_fqdn or f"eric-sec-certm.{config.oam_site_domain_name}",
        "beamctl_path": "/usr/local/bin/beamctl",
        "bamctl_path": "/usr/local/bin/bamctl",
        "setup_complete": True,
    }
    save_setup_config(setup_state)
    results["setup_state"] = setup_state

    return results


async def perform_login(request: LoginRequest) -> Job:
    """Login to beamctl using IAM credentials."""
    setup = get_setup_config()
    if not setup:
        raise RuntimeError("Setup not complete. Run initial setup first.")

    iam_fqdn = setup.get("iam_fqdn", "")
    iam_url = request.iam_url or f"https://{iam_fqdn}/auth/realms/master/protocol/openid-connect/token"

    return await execute_login(
        username=request.username,
        password=request.password,
        iam_url=iam_url,
    )


async def redownload_beamctl() -> Job:
    """Re-download beamctl binary (for upgrades)."""
    setup = get_setup_config()
    if not setup:
        raise RuntimeError("Setup not complete. Run initial setup first.")

    beam_fqdn = setup.get("beam_cli_fqdn", "")
    return await download_beamctl(beam_fqdn)


def get_setup_status() -> dict:
    config = get_setup_config()
    if not config:
        return {"setup_complete": False}
    return config
