from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.setup_routes import router as setup_router
from backend.api.nrf_routes import router as nrf_router
from backend.api.jobs_routes import router as jobs_router, ws_router
from backend.api.deploy_routes import router as deploy_router
from backend.api.cert_gen_routes import router as cert_gen_router
from backend.api.sdp_routes import router as sdp_router
from backend.api.diameter_routes import router as diameter_router
from backend.api.scp_routes import router as scp_router
from backend.api.sub_acct_loc_routes import router as sub_acct_loc_router
from backend.api.mediation_routes import router as mediation_router
from backend.api.access_mgmt_routes import router as access_mgmt_router
from backend.api.alarm_routes import router as alarm_router
from backend.api.backup_routes import router as backup_router
from backend.api.cert_mgmt_routes import router as cert_mgmt_router
from backend.api.data_collector_routes import router as data_collector_router
from backend.api.xdc_routes import router as xdc_router
from backend.api.trace_routes import router as trace_router
from backend.api.enm_routes import router as enm_router
from backend.api.syslog_routes import router as syslog_router
from backend.api.excel_routes import router as excel_router

app = FastAPI(
    title="CAF Automation Portal",
    description="Internal CAF automation portal for NRF integrations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(setup_router)
app.include_router(nrf_router)
app.include_router(jobs_router)
app.include_router(deploy_router)
app.include_router(cert_gen_router)
app.include_router(sdp_router)
app.include_router(diameter_router)
app.include_router(scp_router)
app.include_router(sub_acct_loc_router)
app.include_router(mediation_router)
app.include_router(access_mgmt_router)
app.include_router(alarm_router)
app.include_router(backup_router)
app.include_router(cert_mgmt_router)
app.include_router(data_collector_router)
app.include_router(xdc_router)
app.include_router(trace_router)
app.include_router(enm_router)
app.include_router(syslog_router)
app.include_router(excel_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
