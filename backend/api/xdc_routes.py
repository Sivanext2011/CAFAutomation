from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/xdc", tags=["xdc"])


async def _run(command_args: list, operation: str, input_payload: dict = None):
    job = await execute_command(
        command_args=["xdc"] + command_args,
        operation=operation,
        input_payload=input_payload,
        cli="bamctl",
    )
    return {"status": job.status, "job": job.model_dump()}


@router.get("/targets")
async def get_targets():
    return await _run(["get-targets"], "xdc-get-targets")


@router.get("/collections")
async def list_collections():
    return await _run(["list-collections"], "xdc-list-collections")


@router.get("/collections/{collection_id}")
async def get_collection(collection_id: str):
    return await _run(["get-collection", collection_id], "xdc-get-collection", {"id": collection_id})


@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str):
    return await _run(["delete-collection", collection_id], "xdc-delete-collection", {"id": collection_id})


@router.post("/collect-immediate")
async def collect_immediate(request: Request):
    data = await request.json()
    args = ["collect-immediate", data["target"]]
    if data.get("extra"):
        args.extend(["--extra", data["extra"]])
    return await _run(args, "xdc-collect-immediate", {"target": data["target"]})


@router.post("/new-collection")
async def new_collection(request: Request):
    data = await request.json()
    args = ["new-data-collection", data["target"]]
    if data.get("extra"):
        args.extend(["--extra", data["extra"]])
    return await _run(args, "xdc-new-collection", {"target": data["target"]})


@router.post("/get-file/{collection_id}")
async def get_collection_file(collection_id: str):
    return await _run(["get-collection-file", collection_id], "xdc-get-file", {"id": collection_id})


@router.get("/config")
async def config_view():
    return await _run(["config-view"], "xdc-config-view")
