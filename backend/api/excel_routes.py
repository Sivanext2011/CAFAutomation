import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from backend.services.excel_service import generate_template, generate_current_config, parse_excel
from backend.executor import execute_command
from backend.services import nrf_service

router = APIRouter(prefix="/api/excel", tags=["excel"])


@router.get("/template")
async def download_template():
    data = generate_template()
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=CAF_Integration_Template.xlsx"},
    )


@router.get("/export-current")
async def export_current_config():
    """Export current cluster config to Excel."""
    # Fetch all current configs
    realms, peers, sub_acct, nrf_srv, oauth_srv, nf_prof = [], [], [], {}, {}, {}

    try:
        from backend.services.nrf_service import list_nrf_servers, list_nrf_oauth_servers, list_nf_profile_config
        from backend.api.sdp_routes import _run_external_rating

        r = await _run_external_rating("list-realms", operation="export-realms")
        if r["job"]["stdout"]:
            try: realms = json.loads(r["job"]["stdout"])
            except: pass

        r = await _run_external_rating("list-peers", operation="export-peers")
        if r["job"]["stdout"]:
            try: peers = json.loads(r["job"]["stdout"])
            except: pass

        # Sub acct loc
        from backend.executor import execute_command
        job = await execute_command(["subscriber-account-location", "list"], operation="export-sub-acct", cli="bamctl")
        if job.stdout:
            try:
                parsed = json.loads(job.stdout)
                sub_acct = parsed.get("resources", []) if isinstance(parsed, dict) else parsed
            except: pass

        # NRF Servers
        job = await list_nrf_servers()
        if job.stdout:
            try: nrf_srv = json.loads(job.stdout)
            except: pass

        # OAuth Servers
        job = await list_nrf_oauth_servers()
        if job.stdout:
            try: oauth_srv = json.loads(job.stdout)
            except: pass

        # NF Profile
        job = await list_nf_profile_config()
        if job.stdout:
            try: nf_prof = json.loads(job.stdout)
            except: pass

    except Exception:
        pass

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
