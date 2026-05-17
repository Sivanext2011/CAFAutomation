from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/backup", tags=["backup-restore"])


async def _run(command_args: list, operation: str, input_payload: dict = None, stdin_json=None):
    job = await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
        cli="bamctl",
    )
    return {"status": job.status, "job": job.model_dump()}


# Health & Info
@router.get("/health")
async def get_health():
    return await _run(["backup-restore-v4", "get-health"], "backup-get-health")

@router.get("/managers")
async def list_managers():
    return await _run(["backup-restore-v4", "list-backup-managers"], "backup-list-managers")

@router.get("/managers/{brm_id}")
async def get_manager(brm_id: str):
    return await _run(["backup-restore-v4", "get-backup-manager", brm_id], "backup-get-manager", {"brmId": brm_id})

@router.get("/managers/{brm_id}/agents")
async def list_agents(brm_id: str):
    return await _run(["backup-restore-v4", "list-agents", brm_id], "backup-list-agents", {"brmId": brm_id})

# Backups
@router.get("/managers/{brm_id}/backups")
async def list_backups(brm_id: str):
    return await _run(["backup-restore-v4", "list-backups", brm_id], "backup-list-backups", {"brmId": brm_id})

@router.post("/managers/{brm_id}/backups")
async def create_backup(brm_id: str, request: Request):
    d = await request.json()
    return await _run(["backup-restore-v4", "create-backup", brm_id], "backup-create", {"brmId": brm_id, "name": d["name"]}, stdin_json=d)

@router.get("/managers/{brm_id}/backups/{name}")
async def get_backup(brm_id: str, name: str):
    return await _run(["backup-restore-v4", "get-backup", brm_id, name], "backup-get", {"brmId": brm_id, "name": name})

@router.delete("/managers/{brm_id}/backups/{name}")
async def delete_backup(brm_id: str, name: str):
    return await _run(["backup-restore-v4", "delete-backup", brm_id, name], "backup-delete", {"brmId": brm_id, "name": name})

# Restore
@router.post("/managers/{brm_id}/backups/{name}/restore")
async def create_restore(brm_id: str, name: str):
    return await _run(["backup-restore-v4", "create-restore", brm_id, name], "backup-restore", {"brmId": brm_id, "name": name})

# Export
@router.post("/managers/{brm_id}/backups/{name}/export")
async def create_export(brm_id: str, name: str, request: Request):
    d = await request.json()
    return await _run(["backup-restore-v4", "create-export", brm_id, name], "backup-export", {"brmId": brm_id, "name": name}, stdin_json=d)

@router.get("/managers/{brm_id}/backups/{name}/exports")
async def list_exports(brm_id: str, name: str):
    return await _run(["backup-restore-v4", "list-exports", brm_id, name], "backup-list-exports", {"brmId": brm_id, "name": name})

# Import
@router.post("/managers/{brm_id}/import")
async def create_import(brm_id: str, request: Request):
    d = await request.json()
    return await _run(["backup-restore-v4", "create-import", brm_id], "backup-import", {"brmId": brm_id}, stdin_json=d)

@router.get("/managers/{brm_id}/imports")
async def list_imports(brm_id: str):
    return await _run(["backup-restore-v4", "list-imports", brm_id], "backup-list-imports", {"brmId": brm_id})

# Tasks
@router.get("/managers/{brm_id}/tasks")
async def list_tasks(brm_id: str):
    return await _run(["backup-restore-v4", "list-tasks", brm_id], "backup-list-tasks", {"brmId": brm_id})

@router.get("/managers/{brm_id}/last-task")
async def get_last_task(brm_id: str):
    return await _run(["backup-restore-v4", "get-last-task", brm_id], "backup-last-task", {"brmId": brm_id})

# SFTP Servers
@router.get("/managers/{brm_id}/sftp-servers")
async def list_sftp(brm_id: str):
    return await _run(["backup-restore-v4", "list-sftp-servers", brm_id], "backup-list-sftp", {"brmId": brm_id})

@router.post("/managers/{brm_id}/sftp-servers")
async def create_sftp(brm_id: str, request: Request):
    d = await request.json()
    return await _run(["backup-restore-v4", "create-sftp-server", brm_id], "backup-create-sftp", {"brmId": brm_id, "name": d.get("sftpServerName")}, stdin_json=d)

@router.delete("/managers/{brm_id}/sftp-servers/{name}")
async def delete_sftp(brm_id: str, name: str):
    return await _run(["backup-restore-v4", "delete-sftp-server", brm_id, name], "backup-delete-sftp", {"brmId": brm_id, "name": name})

# Housekeeping
@router.get("/managers/{brm_id}/housekeeping")
async def get_housekeeping(brm_id: str):
    return await _run(["backup-restore-v4", "get-housekeeping", brm_id], "backup-get-housekeeping", {"brmId": brm_id})

@router.post("/managers/{brm_id}/housekeeping")
async def patch_housekeeping(brm_id: str, request: Request):
    d = await request.json()
    return await _run(["backup-restore-v4", "patch-housekeeping", brm_id], "backup-patch-housekeeping", {"brmId": brm_id}, stdin_json=d)

# Scheduling
@router.get("/managers/{brm_id}/scheduling")
async def get_scheduling(brm_id: str):
    return await _run(["backup-restore-v4", "get-scheduling", brm_id], "backup-get-scheduling", {"brmId": brm_id})

@router.post("/managers/{brm_id}/periodic-schedule")
async def create_periodic(brm_id: str, request: Request):
    d = await request.json()
    return await _run(["backup-restore-v4", "create-periodic-schedule", brm_id], "backup-create-periodic", {"brmId": brm_id}, stdin_json=d)

@router.delete("/managers/{brm_id}/periodic-schedule/{sid}")
async def delete_periodic(brm_id: str, sid: str):
    return await _run(["backup-restore-v4", "delete-periodic-schedule", brm_id, sid], "backup-delete-periodic", {"brmId": brm_id, "scheduleId": sid})

@router.post("/managers/{brm_id}/calendar-schedule")
async def create_calendar(brm_id: str, request: Request):
    d = await request.json()
    return await _run(["backup-restore-v4", "create-calendar-schedule", brm_id], "backup-create-calendar", {"brmId": brm_id}, stdin_json=d)

@router.delete("/managers/{brm_id}/calendar-schedule/{sid}")
async def delete_calendar(brm_id: str, sid: str):
    return await _run(["backup-restore-v4", "delete-calendar-schedule", brm_id, sid], "backup-delete-calendar", {"brmId": brm_id, "scheduleId": sid})
