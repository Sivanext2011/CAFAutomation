from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel, Field
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from datetime import datetime, timedelta, timezone
import base64

router = APIRouter(prefix="/api/certs", tags=["certificates"])


class GenerateCertRequest(BaseModel):
    common_name: str = Field(..., description="CN for the certificate")
    organization: str = Field(default="", description="Organization name")
    country: str = Field(default="", description="2-letter country code")
    validity_days: int = Field(default=365, ge=1, le=3650)


class GenerateCsrRequest(BaseModel):
    common_name: str = Field(..., description="CN for the CSR")
    organization: str = Field(default="", description="Organization name")
    country: str = Field(default="", description="2-letter country code")
    san_dns: list[str] = Field(default_factory=list, description="Subject Alternative Names (DNS)")


@router.post("/generate")
async def generate_self_signed(request: GenerateCertRequest):
    """Generate a self-signed CA certificate + private key, return base64."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    name_attrs = [x509.NameAttribute(NameOID.COMMON_NAME, request.common_name)]
    if request.organization:
        name_attrs.append(x509.NameAttribute(NameOID.ORGANIZATION_NAME, request.organization))
    if request.country:
        name_attrs.append(x509.NameAttribute(NameOID.COUNTRY_NAME, request.country))

    subject = issuer = x509.Name(name_attrs)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=request.validity_days))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )

    cert_pem = cert.public_bytes(serialization.Encoding.PEM)
    key_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )

    # Also produce PKCS#12 for SBI key install
    p12 = serialization.pkcs12.serialize_key_and_certificates(
        name=request.common_name.encode(),
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.NoEncryption(),
    )

    return {
        "cert_base64": base64.b64encode(cert_pem).decode(),
        "key_base64": base64.b64encode(key_pem).decode(),
        "p12_base64": base64.b64encode(p12).decode(),
        "cert_pem": cert_pem.decode(),
    }


@router.post("/csr")
async def generate_csr(request: GenerateCsrRequest):
    """Generate a CSR + private key. Returns CSR PEM for download and key base64."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    name_attrs = [x509.NameAttribute(NameOID.COMMON_NAME, request.common_name)]
    if request.organization:
        name_attrs.append(x509.NameAttribute(NameOID.ORGANIZATION_NAME, request.organization))
    if request.country:
        name_attrs.append(x509.NameAttribute(NameOID.COUNTRY_NAME, request.country))

    builder = x509.CertificateSigningRequestBuilder().subject_name(x509.Name(name_attrs))

    if request.san_dns:
        san = x509.SubjectAlternativeName([x509.DNSName(d) for d in request.san_dns])
        builder = builder.add_extension(san, critical=False)

    csr = builder.sign(key, hashes.SHA256())

    csr_pem = csr.public_bytes(serialization.Encoding.PEM)
    key_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )

    return {
        "csr_pem": csr_pem.decode(),
        "key_base64": base64.b64encode(key_pem).decode(),
    }
