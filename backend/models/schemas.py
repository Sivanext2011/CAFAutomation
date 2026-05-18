from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum
from datetime import datetime


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class NfServiceType(str, Enum):
    NFSERVICES = "nfservices"
    NFSERVICELIST = "nfservicelist"
    BOTH = "both"


# --- Security Configuration Models ---

class NrfSecurityConfig(BaseModel):
    secured: bool = Field(default=True, description="NRF transport: True=HTTPS, False=HTTP")


class OauthSecurityConfig(BaseModel):
    enabled: bool = Field(default=False, description="Whether OAuth is used for NRF communication")
    secured: bool = Field(default=True, description="OAuth transport: True=HTTPS, False=HTTP")


class SecurityProfile(BaseModel):
    """Independent security settings for NRF and OAuth."""
    nrf: NrfSecurityConfig = Field(default_factory=NrfSecurityConfig)
    oauth: OauthSecurityConfig = Field(default_factory=OauthSecurityConfig)
    mtls: bool = Field(default=False, description="Mutual TLS enabled")
    customer_pki: bool = Field(default=False, description="Customer-managed PKI certificates")


# --- Setup Models ---

class SetupConfig(BaseModel):
    oam_site_domain_name: str
    beam_cli_fqdn: Optional[str] = None
    bam_cli_fqdn: Optional[str] = None
    iam_fqdn: Optional[str] = None
    certm_fqdn: Optional[str] = None
    namespace: Optional[str] = None
    kubeconfig_content: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    iam_url: Optional[str] = None


# --- NRF Server Models ---

class AddNrfServerRequest(BaseModel):
    address: str = Field(..., description="NRF endpoint address. Format: http(s)://<fqdn/ipv4/[ipv6]>:<port>")
    failure_codes: Optional[List[int]] = Field(default=None, description="HTTP status codes for NRF failover")
    secured: bool = Field(default=True, description="NRF transport security")
    compression: bool = Field(default=True)
    nf_profile_validation: bool = Field(default=True)
    nf_service_type: NfServiceType = Field(default=NfServiceType.NFSERVICES)
    app_grp: str = Field(default="global")

    @field_validator("failure_codes")
    @classmethod
    def validate_failure_codes(cls, v):
        if v is None:
            return v
        for code in v:
            if code < 400 or code > 599:
                raise ValueError(f"Invalid HTTP failure code: {code}. Must be 400-599.")
        return v

    @field_validator("address")
    @classmethod
    def validate_address_scheme(cls, v, info):
        """Validate address scheme matches secured flag."""
        # Validation happens at service layer with access to secured field
        return v

    def to_beamctl_json(self) -> dict:
        payload = {
            "address": self.address,
            "secured": self.secured,
            "compression": self.compression,
            "nfProfileValidation": self.nf_profile_validation,
            "nfServiceType": self.nf_service_type.value,
            "appGrp": self.app_grp,
        }
        if self.failure_codes:
            payload["failureCodes"] = self.failure_codes
        return payload


# --- NRF OAuth Server Models ---

class AddNrfOauthServerRequest(BaseModel):
    address: str = Field(..., description="NRF-OAuth endpoint address")
    failure_codes: Optional[List[int]] = Field(default=None)
    secured: bool = Field(default=True, description="OAuth transport security")
    app_grp: str = Field(default="global")

    @field_validator("failure_codes")
    @classmethod
    def validate_failure_codes(cls, v):
        if v is None:
            return v
        for code in v:
            if code < 400 or code > 599:
                raise ValueError(f"Invalid HTTP failure code: {code}. Must be 400-599.")
        return v

    def to_beamctl_json(self) -> dict:
        payload = {
            "address": self.address,
            "secured": self.secured,
            "appGrp": self.app_grp,
        }
        if self.failure_codes:
            payload["failureCodes"] = self.failure_codes
        return payload


# --- Combined NRF + OAuth Setup (Scenario-based) ---

class NrfDeploymentRequest(BaseModel):
    """
    Combined request that handles all 6 deployment scenarios:
    1. HTTP NRF, No OAuth
    2. HTTP NRF, OAuth over HTTP
    3. HTTP NRF, OAuth over HTTPS
    4. HTTPS NRF, No OAuth
    5. HTTPS NRF, OAuth over HTTP
    6. HTTPS NRF, OAuth over HTTPS
    """
    # NRF Server config
    nrf_address: str = Field(..., description="NRF endpoint address")
    nrf_secured: bool = Field(default=True, description="NRF uses HTTPS")
    nrf_failure_codes: Optional[List[int]] = Field(default_factory=lambda: [404, 500])
    compression: bool = Field(default=True)
    nf_profile_validation: bool = Field(default=True)
    nf_service_type: NfServiceType = Field(default=NfServiceType.NFSERVICES)
    app_grp: str = Field(default="global")

    # OAuth config (independent from NRF)
    oauth_enabled: bool = Field(default=False)
    oauth_address: Optional[str] = Field(default=None, description="OAuth endpoint address")
    oauth_secured: Optional[bool] = Field(default=True, description="OAuth uses HTTPS")
    oauth_failure_codes: Optional[List[int]] = Field(default_factory=lambda: [404, 500])

    # TLS/PKI config
    mtls: bool = Field(default=False)
    customer_pki: bool = Field(default=False)

    @field_validator("nrf_failure_codes", "oauth_failure_codes")
    @classmethod
    def validate_codes(cls, v):
        if v is None:
            return v
        for code in v:
            if code < 400 or code > 599:
                raise ValueError(f"Invalid HTTP failure code: {code}. Must be 400-599.")
        return v

    def get_scenario(self) -> int:
        """Determine which deployment scenario this represents."""
        if not self.nrf_secured and not self.oauth_enabled:
            return 1
        elif not self.nrf_secured and self.oauth_enabled and not self.oauth_secured:
            return 2
        elif not self.nrf_secured and self.oauth_enabled and self.oauth_secured:
            return 3
        elif self.nrf_secured and not self.oauth_enabled:
            return 4
        elif self.nrf_secured and self.oauth_enabled and not self.oauth_secured:
            return 5
        elif self.nrf_secured and self.oauth_enabled and self.oauth_secured:
            return 6
        return 0

    def to_nrf_server_json(self) -> dict:
        payload = {
            "address": self.nrf_address,
            "secured": self.nrf_secured,
            "compression": self.compression,
            "nfProfileValidation": self.nf_profile_validation,
            "nfServiceType": self.nf_service_type.value,
            "appGrp": self.app_grp,
        }
        if self.nrf_failure_codes:
            payload["failureCodes"] = self.nrf_failure_codes
        return payload

    def to_oauth_server_json(self) -> Optional[dict]:
        if not self.oauth_enabled or not self.oauth_address:
            return None
        payload = {
            "address": self.oauth_address,
            "secured": self.oauth_secured,
            "appGrp": self.app_grp,
        }
        if self.oauth_failure_codes:
            payload["failureCodes"] = self.oauth_failure_codes
        return payload


# --- Registration Properties Models ---

class UpdateRegistrationPropertiesRequest(BaseModel):
    nf_registration_scope: str = Field(default="nnrf-nfm")
    retries_for_nrf_connection: int = Field(default=3, ge=0)
    retry_interval_for_nrf_connection: int = Field(default=30, ge=0, description="Seconds")
    target_nf_type: str = Field(default="NRF")
    response_timeout: int = Field(default=1000, ge=0, le=1000000, description="Milliseconds")
    connection_timeout: int = Field(default=10, ge=0, le=1000, description="Seconds")

    def to_beamctl_json(self) -> dict:
        return {
            "nfRegistrationScope": self.nf_registration_scope,
            "retriesForNrfConnection": self.retries_for_nrf_connection,
            "retryIntervalForNrfConnection": self.retry_interval_for_nrf_connection,
            "targetNfType": self.target_nf_type,
            "responseTimeout": self.response_timeout,
            "connectionTimeout": self.connection_timeout,
        }


# --- NF Profile Config Models ---

class UpdateNfProfileConfigRequest(BaseModel):
    app_group_name: str
    payload: dict = Field(..., description="NF Profile JSON payload")


# --- Job Models ---

class Job(BaseModel):
    id: str
    command: str
    status: JobStatus = JobStatus.PENDING
    stdout: str = ""
    stderr: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    operation: str = ""
    input_payload: Optional[dict] = None
