from backend.models.schemas import SetupConfig, LoginRequest, Job
from backend.executor import (
    execute_login, execute_bamctl_login, execute_config_set,
    download_beamctl, download_bamctl, save_kubeconfig,
    BEAMCTL_PATH, BAMCTL_PATH, KUBECONFIG_PATH,
)
from backend.storage import get_setup_config, save_setup_config
from backend.services.session_service import create_session, get_session_info, list_active_sessions
from backend.validators import validate_fqdn
from pathlib import Path


async def perform_cluster_setup(config: SetupConfig) -> dict:
    """One-time cluster setup: download CLIs, save kubeconfig, configure FQDN."""
    error = validate_fqdn(config.oam_site_domain_name)
    if error:
        raise ValueError(error)

    results = {}

    beam_fqdn = config.beam_cli_fqdn or f"eric-bss-beam-cli.{config.oam_site_domain_name}"
    bam_fqdn = config.bam_cli_fqdn or f"eric-bss-bam-cli.{config.oam_site_domain_name}"

    # Download binaries
    download_job = await download_beamctl(beam_fqdn)
    results["download_beamctl"] = download_job.model_dump()

    bam_job = await download_bamctl(bam_fqdn)
    results["download_bamctl"] = bam_job.model_dump()

    if download_job.status != "success":
        raise RuntimeError(f"Failed to download beamctl: {download_job.stderr}")
    if bam_job.status != "success":
        raise RuntimeError(f"Failed to download bamctl: {bam_job.stderr}")

    # Save kubeconfig
    if config.kubeconfig_content:
        save_kubeconfig(config.kubeconfig_content)
        results["kubeconfig"] = "saved to bin/kubeconfig"

    # Configure FQDN (uses a temp session)
    temp_session = create_session("setup")
    fqdn_job = await execute_config_set("fqdn", config.oam_site_domain_name, session_id=temp_session)
    results["fqdn_config"] = fqdn_job.model_dump()

    # Save setup state (no credentials)
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


async def perform_login(request: LoginRequest) -> dict:
    """Per-user login: creates a session, logs in both CLIs, returns session_id."""
    setup = get_setup_config()
    if not setup:
        raise RuntimeError("Cluster setup not complete. Run setup first.")

    iam_fqdn = setup.get("iam_fqdn", "")
    iam_url = request.iam_url or f"https://{iam_fqdn}/auth/realms/master/protocol/openid-connect/token"

    # Create session for this user
    session_id = create_session(request.username)

    # Login beamctl with this session
    beam_job = await execute_login(
        username=request.username,
        password=request.password,
        iam_url=iam_url,
        session_id=session_id,
    )

    # Login bamctl with this session
    bam_job = await execute_bamctl_login(
        username=request.username,
        password=request.password,
        iam_url=iam_url,
        session_id=session_id,
    )

    if beam_job.status != "success":
        return {"status": "failed", "session_id": None, "error": beam_job.stderr, "job": beam_job.model_dump()}

    return {
        "status": "success",
        "session_id": session_id,
        "username": request.username,
        "job": beam_job.model_dump(),
    }


async def redownload_all_clis() -> dict:
    """Re-download both CLIs."""
    setup = get_setup_config()
    if not setup:
        raise RuntimeError("Setup not complete.")

    beam_job = await download_beamctl(setup.get("beam_cli_fqdn", ""))
    bam_job = await download_bamctl(setup.get("bam_cli_fqdn", ""))
    return {"beamctl": beam_job.model_dump(), "bamctl": bam_job.model_dump()}


def get_setup_status() -> dict:
    config = get_setup_config()
    if not config:
        return {"setup_complete": False}
    # Check if binaries exist
    config["beamctl_exists"] = Path(BEAMCTL_PATH).exists()
    config["bamctl_exists"] = Path(BAMCTL_PATH).exists()
    config["kubeconfig_exists"] = Path(KUBECONFIG_PATH).exists()
    return config
