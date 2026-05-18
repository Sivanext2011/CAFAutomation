import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import Response
from backend.services.excel_service import generate_template, generate_current_config, parse_excel
from backend.executor import execute_command, execute_nrf_command, execute_nf_profile_command

router = APIRouter(prefix="/api/excel", tags=["excel"])


def _sid(request: Request) -> str:
    return getattr(request.state, "session_id", None)


@router.get("/template")
async def download_template():
    data = generate_template()
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=CAF_Integration_Template.xlsx"},
    )


@router.get("/export-current")
async def export_current_config(request: Request):
    """Export current cluster config to Excel using user's session."""
    session_id = _sid(request)
    realms, peers, sub_acct, nrf_srv, oauth_srv, nf_prof = [], [], [], {}, {}, {}

    # SDP Realms
    job = await execute_command(
        ["external-rating", "list-realms"], operation="export-realms", session_id=session_id
    )
    if job.stdout:
        try: realms = json.loads(job.stdout)
        except: pass

    # SDP Peers
    job = await execute_command(
        ["external-rating", "list-peers"], operation="export-peers", session_id=session_id
    )
    if job.stdout:
        try: peers = json.loads(job.stdout)
        except: pass

    # Subscriber Account Location
    job = await execute_command(
        ["subscriber-account-location", "list"], operation="export-sub-acct", cli="bamctl", session_id=session_id
    )
    if job.stdout:
        try:
            parsed = json.loads(job.stdout)
            sub_acct = parsed.get("resources", []) if isinstance(parsed, dict) else parsed
        except: pass

    # NRF Servers
    job = await execute_nrf_command("list-nrf-servers", operation="export-nrf-servers", session_id=session_id)
    if job.stdout:
        try: nrf_srv = json.loads(job.stdout)
        except: pass

    # OAuth Servers
    job = await execute_nrf_command("list-nrf-oauth-servers", operation="export-oauth-servers", session_id=session_id)
    if job.stdout:
        try: oauth_srv = json.loads(job.stdout)
        except: pass

    # NF Profile
    job = await execute_nf_profile_command("list-nf-profile-config", operation="export-nf-profile", session_id=session_id)
    if job.stdout:
        try: nf_prof = json.loads(job.stdout)
        except: pass

    data = generate_current_config(realms, peers, sub_acct, [], nrf_srv, oauth_srv, nf_prof)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=CAF_Current_Config.xlsx"},
    )


@router.post("/parse")
async def parse_uploaded_excel(file: UploadFile = File(...)):
    """Parse uploaded Excel and return structured preview data."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx files supported")
    content = await file.read()
    try:
        result = parse_excel(content)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {str(e)}")
