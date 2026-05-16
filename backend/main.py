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
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
