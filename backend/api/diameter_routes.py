from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/diameter", tags=["diameter"])


async def _run_diameter(command_args: list, operation: str, input_payload: dict = None):
    job = await execute_command(
        command_args=["diameter-interface"] + command_args,
        operation=operation,
        input_payload=input_payload,
    )
    return {"status": job.status, "job": job.model_dump()}


@router.get("/proxies/{app_grp}")
async def get_proxies(app_grp: str):
    return await _run_diameter(
        ["get-diameter-proxies", app_grp],
        operation="diameter-get-proxies",
        input_payload={"appGrp": app_grp},
    )


@router.post("/proxy")
async def add_proxy(request: Request):
    data = await request.json()
    args = [
        "add-diameter-proxy", data["appGrp"], data["host"], data["realm"],
        f"--port={data.get('port', '3868')}",
        f"--scheme={data.get('scheme', 'aaa')}",
        f"--transport={data.get('transport', 'tcp')}",
    ]
    return await _run_diameter(args, operation="diameter-add-proxy", input_payload=data)


@router.delete("/proxy")
async def remove_proxy(request: Request):
    data = await request.json()
    args = ["remove-diameter-proxy", data["appGrp"], data["host"], data["realm"]]
    return await _run_diameter(args, operation="diameter-remove-proxy", input_payload=data)


@router.get("/peers/{app_grp}")
async def get_peers(app_grp: str):
    return await _run_diameter(
        ["get-diameter-peers", app_grp],
        operation="diameter-get-peers",
        input_payload={"appGrp": app_grp},
    )


@router.post("/peer")
async def add_peer(request: Request):
    data = await request.json()
    args = [
        "add-diameter-peer", data["appGrp"], data["host"],
        f"--port={data.get('port', '3868')}",
        f"--scheme={data.get('scheme', 'aaa')}",
        f"--transport={data.get('transport', 'tcp')}",
        f"--initiateconnection={str(data.get('initiateConnection', True)).lower()}",
        f"--raisealarm={str(data.get('raiseAlarm', True)).lower()}",
    ]
    return await _run_diameter(args, operation="diameter-add-peer", input_payload=data)


@router.delete("/peer")
async def remove_peer(request: Request):
    data = await request.json()
    args = ["remove-diameter-peer", data["appGrp"], data["host"]]
    return await _run_diameter(args, operation="diameter-remove-peer", input_payload=data)


@router.post("/restrict-peer-list")
async def set_restrict(request: Request):
    data = await request.json()
    val = str(data.get("restrict", True)).lower()
    return await _run_diameter(
        ["set-restrict-to-peer-list", val],
        operation="diameter-set-restrict",
        input_payload=data,
    )


@router.post("/bulk")
async def bulk_add(request: Request):
    """Add multiple proxies and peers in one call."""
    data = await request.json()
    results = {"proxies": [], "peers": []}

    for p in data.get("proxies", []):
        args = [
            "add-diameter-proxy", p["appGrp"], p["host"], p["realm"],
            f"--port={p.get('port', '3868')}",
            f"--scheme={p.get('scheme', 'aaa')}",
            f"--transport={p.get('transport', 'tcp')}",
        ]
        job = await execute_command(
            command_args=["diameter-interface"] + args,
            operation="diameter-add-proxy",
            input_payload=p,
        )
        results["proxies"].append({"host": p["host"], "status": job.status, "job_id": job.id})

    for p in data.get("peers", []):
        args = [
            "add-diameter-peer", p["appGrp"], p["host"],
            f"--port={p.get('port', '3868')}",
            f"--scheme={p.get('scheme', 'aaa')}",
            f"--transport={p.get('transport', 'tcp')}",
            f"--initiateconnection={str(p.get('initiateConnection', True)).lower()}",
            f"--raisealarm={str(p.get('raiseAlarm', True)).lower()}",
        ]
        job = await execute_command(
            command_args=["diameter-interface"] + args,
            operation="diameter-add-peer",
            input_payload=p,
        )
        results["peers"].append({"host": p["host"], "status": job.status, "job_id": job.id})

    failed = [r for r in results["proxies"] + results["peers"] if r["status"] == "failed"]
    status = "failed" if failed else "success"
    return {"status": status, "results": results}
