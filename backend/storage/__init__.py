import json
import os
from pathlib import Path
from typing import Optional

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data").strip())

JOBS_DIR = DATA_DIR / "jobs"
CONFIGS_DIR = DATA_DIR / "configs"
TEMPLATES_DIR = DATA_DIR / "templates"
LOGS_DIR = DATA_DIR / "logs"
STATE_DIR = DATA_DIR / "state"
DEFAULTS_DIR = DATA_DIR / "defaults"


def _ensure_dirs():
    for d in [JOBS_DIR, CONFIGS_DIR, TEMPLATES_DIR, LOGS_DIR, STATE_DIR, DEFAULTS_DIR]:
        d.mkdir(parents=True, exist_ok=True)


_ensure_dirs()


def read_json(filepath: Path) -> Optional[dict]:
    if not filepath.exists():
        return None
    with open(filepath, "r") as f:
        return json.load(f)


def write_json(filepath: Path, data: dict):
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def list_json_files(directory: Path) -> list:
    if not directory.exists():
        return []
    return sorted(directory.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)


def delete_json(filepath: Path) -> bool:
    if filepath.exists():
        filepath.unlink()
        return True
    return False


# --- State helpers ---

def get_state(key: str) -> Optional[dict]:
    return read_json(STATE_DIR / f"{key}.json")


def set_state(key: str, data: dict):
    write_json(STATE_DIR / f"{key}.json", data)


# --- Job helpers ---

def save_job(job_data: dict):
    write_json(JOBS_DIR / f"{job_data['id']}.json", job_data)


def get_job(job_id: str) -> Optional[dict]:
    return read_json(JOBS_DIR / f"{job_id}.json")


def list_jobs(limit: int = 50) -> list:
    files = list_json_files(JOBS_DIR)[:limit]
    jobs = []
    for f in files:
        data = read_json(f)
        if data:
            jobs.append(data)
    return jobs


# --- Setup state ---

def get_setup_config() -> Optional[dict]:
    return get_state("setup")


def save_setup_config(config: dict):
    set_state("setup", config)


def is_setup_complete() -> bool:
    config = get_setup_config()
    return config is not None and config.get("setup_complete", False)
