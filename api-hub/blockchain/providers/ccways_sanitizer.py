"""
CCWAYS Response Sanitizer — White-Label Enforcement Layer

CRITICAL: This module ensures ZERO traces of upstream providers appear in
any response, error message, header, URL, or field name sent to the client.

Every response passes through sanitize_response() before leaving the gateway.
"""

import re
import logging
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Blacklisted patterns — anything matching these is scrubbed
# ═══════════════════════════════════════════════════════════════════════════════

# Domain patterns (case-insensitive)
_DOMAIN_PATTERNS = re.compile(
    r"(?:https?://)?(?:www\.)?"
    r"(?:"
    r"api\.arkm\.com|"
    r"intel\.arkm\.com|"
    r"arkm\.com|"
    r"api\.debank\.com|"
    r"debank\.com|"
    r"static\.debank\.com|"
    r"assets\.debank\.com"
    r")"
    r"[^\s\"']*",
    re.IGNORECASE,
)

# String patterns to replace in values
_VALUE_REPLACEMENTS: List[tuple] = [
    # Provider names (case-insensitive matching, case-preserving replacement)
    (re.compile(r"\barkham\b", re.IGNORECASE), "ccways"),
    (re.compile(r"\barkm\b", re.IGNORECASE), "ccways"),
    (re.compile(r"\bdebank\b", re.IGNORECASE), "ccways"),
    (re.compile(r"\bintel\.arkm\b", re.IGNORECASE), "ccways"),
    (re.compile(r"\bapi\.arkm\b", re.IGNORECASE), "ccways"),
]

# Keys to completely remove from response dicts
_BLACKLISTED_KEYS = frozenset({
    "arkham_id", "arkham_entity_id", "arkm_id", "debank_id",
    "arkham_source", "debank_source",
    "x-timestamp", "x-payload", "x_timestamp", "x_payload",
    "x-api-key", "x-api-nonce", "x-api-sign", "x-api-ts",
    "x_api_key", "x_api_nonce", "x_api_sign", "x_api_ts",
    "provider_raw", "upstream_headers", "raw_response",
})

# Key prefixes to strip
_BLACKLISTED_KEY_PREFIXES = (
    "arkham_", "arkm_", "debank_", "intel_",
    "x_api_", "x-api-",
)

# Keys whose values should be replaced with proxied URLs
_LOGO_KEYS = frozenset({
    "logo_url", "svg_logo_url", "white_logo_url", "icon_url",
    "logo", "icon", "image_url", "img_url", "thumbnail",
})

# CDN domains to proxy through our asset endpoint
_EXTERNAL_CDN_PATTERN = re.compile(
    r"https?://(?:static\.debank\.com|assets\.debank\.com|"
    r"cdn\.arkm\.com|intel\.arkm\.com/static)[^\s\"']*",
    re.IGNORECASE,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Core sanitizer
# ═══════════════════════════════════════════════════════════════════════════════

def sanitize_response(data: Any, depth: int = 0) -> Any:
    """
    Recursively sanitize a response object.
    Removes all traces of upstream providers from keys, values, and URLs.

    Args:
        data: Any JSON-serializable value (dict, list, str, number, etc.)
        depth: Recursion depth guard (max 50)

    Returns:
        Sanitized copy of the data
    """
    if depth > 50:
        return data

    if isinstance(data, dict):
        return _sanitize_dict(data, depth)
    elif isinstance(data, list):
        return [sanitize_response(item, depth + 1) for item in data]
    elif isinstance(data, str):
        return _sanitize_string(data)
    else:
        return data


def _sanitize_dict(d: Dict[str, Any], depth: int) -> Dict[str, Any]:
    """Sanitize a dictionary — remove blacklisted keys, clean values."""
    result = {}
    for key, value in d.items():
        key_lower = key.lower()

        # Skip completely blacklisted keys
        if key_lower in _BLACKLISTED_KEYS:
            continue

        # Skip keys with blacklisted prefixes
        if any(key_lower.startswith(p) for p in _BLACKLISTED_KEY_PREFIXES):
            continue

        # Rename 'source'/'provider' fields that reference upstream
        if key_lower in ("source", "provider", "data_source", "api_source"):
            if isinstance(value, str) and _has_upstream_ref(value):
                value = "ccways"

        # Proxy external logo URLs
        if key_lower in _LOGO_KEYS and isinstance(value, str):
            value = _proxy_logo_url(value)

        # Recurse
        result[key] = sanitize_response(value, depth + 1)

    return result


def _sanitize_string(s: str) -> str:
    """Sanitize a string value — remove domains and provider names."""
    if not s:
        return s

    # Remove full URLs pointing to upstream
    s = _DOMAIN_PATTERNS.sub("", s)

    # Replace provider name references
    for pattern, replacement in _VALUE_REPLACEMENTS:
        s = pattern.sub(replacement, s)

    return s.strip()


def _has_upstream_ref(value: str) -> bool:
    """Check if a string references an upstream provider."""
    v = value.lower()
    return any(
        kw in v
        for kw in ("arkham", "arkm", "debank", "intel.arkm", "api.arkm")
    )


def _proxy_logo_url(url: str) -> str:
    """
    Replace external CDN URLs with our /api/ccways/asset/ proxy.
    Returns the original URL if it's not from a blacklisted CDN.
    """
    if not url:
        return url
    if _EXTERNAL_CDN_PATTERN.match(url):
        # Hash the URL to create a deterministic proxy path
        import hashlib
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return f"/api/ccways/asset/{url_hash}"
    return url


# ═══════════════════════════════════════════════════════════════════════════════
# Error sanitizer
# ═══════════════════════════════════════════════════════════════════════════════

def sanitize_error(exc: Optional[Exception] = None, message: str = "") -> Dict:
    """
    Create a safe error response with no provider info.

    Args:
        exc: Optional exception (message will be scrubbed)
        message: Optional human-readable message

    Returns:
        Safe error dict: {"success": False, "error": {"message": "...", "code": "..."}}
    """
    if exc:
        raw_msg = str(exc)
        # Scrub any upstream references from error messages
        clean_msg = _sanitize_string(raw_msg)
        # If the scrubbed message is empty or weird, use a generic one
        if not clean_msg or len(clean_msg) < 5:
            clean_msg = "Service temporarily unavailable"
    elif message:
        clean_msg = _sanitize_string(message)
    else:
        clean_msg = "Service temporarily unavailable"

    return {
        "success": False,
        "error": {
            "message": clean_msg,
            "code": "CCWAYS_SERVICE_ERROR",
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Header sanitizer
# ═══════════════════════════════════════════════════════════════════════════════

_HEADER_BLACKLIST = frozenset({
    "x-timestamp", "x-payload",
    "x-api-key", "x-api-nonce", "x-api-sign", "x-api-ts", "x-api-ver",
    "server", "x-powered-by", "via",
})


def sanitize_headers(headers: Dict[str, str]) -> Dict[str, str]:
    """Remove upstream-revealing headers."""
    return {
        k: v
        for k, v in headers.items()
        if k.lower() not in _HEADER_BLACKLIST
        and not _has_upstream_ref(k)
        and not _has_upstream_ref(v)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# URL-to-hash mapping for asset proxy
# ═══════════════════════════════════════════════════════════════════════════════

# In-memory map: hash → original URL (for asset proxy endpoint)
_ASSET_URL_MAP: Dict[str, str] = {}


def register_asset_url(url: str) -> str:
    """
    Register an external asset URL and return its proxy path.
    Used by the gateway to track which hashes map to which URLs.
    """
    import hashlib
    url_hash = hashlib.md5(url.encode()).hexdigest()
    _ASSET_URL_MAP[url_hash] = url
    return f"/api/ccways/asset/{url_hash}"


def resolve_asset_url(url_hash: str) -> Optional[str]:
    """Resolve a proxy hash back to the original URL."""
    return _ASSET_URL_MAP.get(url_hash)
