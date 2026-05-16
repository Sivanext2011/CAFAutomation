import re
from typing import Optional


def validate_address(address: str) -> Optional[str]:
    """Validate NRF/OAuth server address format."""
    if not address:
        return "Address is required"
    if not re.match(r'^https?://', address):
        return "Address must start with http:// or https://"
    pattern = r'^https?://[\w\.\-\[\]:]+:\d+$'
    if not re.match(pattern, address):
        pattern_no_port = r'^https?://[\w\.\-\[\]:]+$'
        if not re.match(pattern_no_port, address):
            return "Invalid address format. Expected: http(s)://<fqdn/ipv4/[ipv6]>:<port>"
    return None


def validate_address_scheme(address: str, secured: bool) -> Optional[str]:
    """Validate that address scheme matches the secured flag."""
    if secured and address.startswith("http://"):
        return "Address must use https:// when secured=true"
    if not secured and address.startswith("https://"):
        return "Address must use http:// when secured=false"
    return None


def validate_failure_codes(codes: list[int]) -> Optional[str]:
    """Validate HTTP failure codes are in valid range."""
    if not codes:
        return None
    for code in codes:
        if code < 400 or code > 599:
            return f"Invalid HTTP failure code: {code}. Must be between 400-599."
    return None


def validate_server_id(server_id: str) -> Optional[str]:
    """Validate server ID is a non-negative integer."""
    try:
        val = int(server_id)
        if val < 0:
            return "Server ID must be non-negative"
    except ValueError:
        return "Server ID must be an integer"
    return None


def validate_fqdn(fqdn: str) -> Optional[str]:
    """Validate FQDN format."""
    if not fqdn:
        return "FQDN is required"
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$'
    if not re.match(pattern, fqdn):
        return "Invalid FQDN format"
    return None
