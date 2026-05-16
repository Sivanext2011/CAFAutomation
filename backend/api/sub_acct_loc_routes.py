from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/sub-acct-loc", tags=["sub-acct-loc"])


async def _run(command_args: list, operation: str, input_payload: dict = None, stdin_json=None):
    job = await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
    )
    return {"status": job.status, "job": job.model_dump()}


@router.get("/partitions")
async def list_partitions():
    return await _run(["partitions", "list-cust"], operation="partitions-list-cust")


@router.get("/configs")
async def list_all_configs():
    return await _run(["sub-acct-loc-mgmt", "list-all-confs"], operation="sub-acct-loc-list-all")


@router.get("/configs/{sdp_name}")
async def list_config(sdp_name: str):
    return await _run(
        ["sub-acct-loc-mgmt", "list-conf", sdp_name],
        operation="sub-acct-loc-list",
        input_payload={"name": sdp_name},
    )


@router.post("/configs")
async def create_config(request: Request):
    data = await request.json()
    payload = {"resource": {"configurations": [data]}}
    return await _run(
        ["sub-acct-loc-mgmt", "create-conf"],
        operation="sub-acct-loc-create",
        input_payload=data,
        stdin_json=payload,
    )


@router.put("/configs/{sdp_name}")
async def edit_config(sdp_name: str, request: Request):
    data = await request.json()
    payload = {"resource": {"ip": data["ip"], "partitionId": data["partitionId"]}}
    return await _run(
        ["sub-acct-loc-mgmt", "edit-conf", sdp_name],
        operation="sub-acct-loc-edit",
        input_payload={"name": sdp_name, **data},
        stdin_json=payload,
    )


@router.delete("/configs/{sdp_name}")
async def delete_config(sdp_name: str):
    return await _run(
        ["sub-acct-loc-mgmt", "delete-conf", sdp_name],
        operation="sub-acct-loc-delete",
        input_payload={"name": sdp_name},
    )


@router.post("/bulk")
async def bulk_create(request: Request):
    """Create multiple subscriber account location mappings."""
    entries = await request.json()
    results = []
    for entry in entries:
        payload = {"resource": {"configurations": [entry]}}
        job = await execute_command(
            command_args=["sub-acct-loc-mgmt", "create-conf"],
            operation="sub-acct-loc-create",
            input_payload=entry,
            stdin_json=payload,
        )
        results.append({"name": entry.get("name"), "status": job.status, "job_id": job.id})
    failed = [r for r in results if r["status"] == "failed"]
    return {"status": "failed" if failed else "success", "results": results}
