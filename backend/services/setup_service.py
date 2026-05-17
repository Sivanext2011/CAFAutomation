from backend.models.schemas import SetupConfig, LoginRequest, Job
from backend.executor import (
    execute_login, execute_config_set, download_beamctl, download_bamctl,
    save_kubeconfig, save_login_details, get_login_details,
    BEAMCTL_PATH, BAMCTL_PATH, KUBECONFIG_PATH,
)
from backend.storage import get_setup_config, save_setup_config, is_setup_complete
from backend.validators import validate_fqdn


async def perform_initial_setup(config: SetupConfig) -> dict:
    """Perform initial setup: download beamctl/bamctl, configure FQDN, save kubeconfig."""
    error = validate_fqdn(config.oam_site_domain_name)
    if error:
        raise ValueError(error)

    results = {}

    beam_fqdn = config.beam_cli_fqdn or f"eric-bss-beam-cli.{config.oam_site_domain_name}"
    bam_fqdn = config.bam_cli_fqdn or f"eric-bss-bam-cli.{config.oam_site_domain_name}"

    # Download beamctl binary to ./bin/
    download_job = await download_beamctl(beam_fqdn)
    results["download_beamctl"] = download_job.model_dump()

    if download_job.status != "success":
        raise RuntimeError(f"Failed to download beamctl: {download_job.stderr}")

    # Download bamctl binary to ./bin/
    bam_job = await download_bamctl(bam_fqdn)
    results["download_bamctl"] = bam_job.model_dump()

    # Save kubeconfig content to ./bin/kubeconfig
    if config.kubeconfig_content:
        save_kubeconfig(config.kubeconfig_content)
        results["kubeconfig"] = "saved to bin/kubeconfig"

    # Configure FQDN
    fqdn_job = await execute_config_set("fqdn", config.oam_site_domain_name)
    results["fqdn_config"] = fqdn_job.model_dump()

    if fqdn_job.status != "success":
        raise RuntimeError(f"Failed to configure FQDN: {fqdn_job.stderr}")

    if config.beam_cli_fqdn:
        cli_job = await execute_config_set("cli-server", config.beam_cli_fqdn)
        results["cli_server_config"] = cli_job.model_dump()

    # Save setup state
    setup_state = {
        "oam_site_domain_name": config.oam_site_domain_name,
        "beam_cli_fqdn": beam_fqdn,
        "bam_cli_fqdn": bam_fqdn,
        "iam_fqdn": config.iam_fqdn or f"eric-sec-access-mgmt.{config.oam_site_domain_name}",
        "certm_fqdn": config.certm_fqdn or f"eric-sec-certm.{config.oam_site_domain_name}",
        "namespace": config.namespace or "caf",
        "kubeconfig_path": KUBECONFIG_PATH,
        "beamctl_path": BEAMCTL_PATH,
        "bamctl_path": BAMCTL_PATH,
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

    job = await execute_login(
        username=request.username,
        password=request.password,
        iam_url=iam_url,
    )

    # Save login details to bin dir
    if job.status == "success":
        save_login_details(request.username, iam_url)

    return job


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
    # Include login info if available
    login_info = get_login_details()
    if login_info:
        config["logged_in_user"] = login_info.get("username")
    return config
