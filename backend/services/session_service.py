"""
Session management for multi-user support.
Each user session gets its own CLI config directory so login tokens don't conflict.
Passwords are never stored - only used transiently during login.
"""
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

SESSIONS_DIR = Path(".") / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

# Session TTL - auto-cleanup after 24 hours of inactivity
SESSION_TTL_HOURS = 24

_sessions: dict = {}  # session_id -> {created, last_used, username}


def create_session(username: str) -> str:
    """Create a new session and its CLI home directory."""
    session_id = str(uuid.uuid4())
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    _sessions[session_id] = {
        "created": datetime.utcnow().isoformat(),
        "last_used": datetime.utcnow().isoformat(),
        "username": username,
    }
    return session_id


def get_session_dir(session_id: str) -> Optional[Path]:
    """Get the CLI home directory for a session."""
    if session_id not in _sessions:
        # Check if directory exists (server restart case)
        session_dir = SESSIONS_DIR / session_id
        if session_dir.exists():
            _sessions[session_id] = {
                "created": datetime.utcnow().isoformat(),
                "last_used": datetime.utcnow().isoformat(),
                "username": "unknown",
            }
            return session_dir
        return None
    _sessions[session_id]["last_used"] = datetime.utcnow().isoformat()
    return SESSIONS_DIR / session_id


def get_session_info(session_id: str) -> Optional[dict]:
    """Get session metadata."""
    return _sessions.get(session_id)


def delete_session(session_id: str):
    """Delete a session and its directory."""
    session_dir = SESSIONS_DIR / session_id
    if session_dir.exists():
        shutil.rmtree(session_dir, ignore_errors=True)
    _sessions.pop(session_id, None)


def cleanup_expired_sessions():
    """Remove sessions older than TTL."""
    now = datetime.utcnow()
    expired = []
    for sid, info in _sessions.items():
        last_used = datetime.fromisoformat(info["last_used"])
        if now - last_used > timedelta(hours=SESSION_TTL_HOURS):
            expired.append(sid)
    for sid in expired:
        delete_session(sid)


def list_active_sessions() -> list:
    """List all active sessions."""
    cleanup_expired_sessions()
    return [{"session_id": sid, **info} for sid, info in _sessions.items()]
