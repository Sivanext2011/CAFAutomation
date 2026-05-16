from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from backend.models.schemas import NrfDeploymentRequest
from backend.services.deployment_service import execute_full_deployment
from backend.services.cert_service import put_trusted_certificates, install_asymmetric_keys_pkcs12

router = APIRouter(prefix="/api/deploy", tags=["deployment"])


class CertificateEntry(BaseModel):
    name: str
    certificate: str = Field(..., description="PEM certificate content (single-line base64)")


class TrustCaRequest(BaseModel):
    trust_list_name: str = Field(default="external-trusted-ca-list")
    description: str = ""
    certificates: List[CertificateEntry]


class InstallSbiKeyRequest(BaseModel):
    name: str = Field(default="cha-sbi-key")
    certificate_name: str = Field(default="cha-sbi-cert")
    p12: str = Field(..., description="Base64-encoded PKCS#12 bundle")
    p12_password: str


class FullDeploymentRequest(BaseModel):
    """Full deployment request including NRF config + optional TLS certs."""
    # NRF + OAuth config
    nrf_config: NrfDeploymentRequest

    # Optional TLS certificates
    nrf_ca_certs: Optional[List[CertificateEntry]] = None
    oauth_ca_certs: Optional[List[CertificateEntry]] = None
    sbi_key: Optional[InstallSbiKeyRequest] = None


@router.post("/full")
async def full_deployment(request: FullDeploymentRequest):
    """Execute full deployment workflow (NRF + TLS + OAuth) based on scenario."""
    try:
        nrf_ca = [c.model_dump() for c in request.nrf_ca_certs] if request.nrf_ca_certs else None
        oauth_ca = [c.model_dump() for c in request.oauth_ca_certs] if request.oauth_ca_certs else None
        sbi = request.sbi_key.model_dump() if request.sbi_key else None

        result = await execute_full_deployment(
            request=request.nrf_config,
            nrf_ca_certs=nrf_ca,
            oauth_ca_certs=oauth_ca,
            sbi_key=sbi,
        )
        return {"status": "success", "result": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/trust-ca")
async def trust_ca(request: TrustCaRequest):
    """Install trusted CA certificates into CertM."""
    try:
        certs = [c.model_dump() for c in request.certificates]
        job = await put_trusted_certificates(
            trust_list_name=request.trust_list_name,
            certificates=certs,
            description=request.description,
        )
        return {"status": job.status, "job": job.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/install-sbi-key")
async def install_sbi_key(request: InstallSbiKeyRequest):
    """Install SBI asymmetric key (PKCS#12) into CertM."""
    try:
        job = await install_asymmetric_keys_pkcs12(
            name=request.name,
            certificate_name=request.certificate_name,
            p12_base64=request.p12,
            p12_password=request.p12_password,
        )
        return {"status": job.status, "job": job.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
