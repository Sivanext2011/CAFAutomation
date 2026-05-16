from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/mediation", tags=["mediation"])


async def _run(command_args: list, operation: str, input_payload: dict = None, stdin_json=None):
    job = await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
    )
    return {"status": job.status, "job": job.model_dump()}


# --- Publishing Transform Config (v2) ---

@router.get("/transform/list")
async def transform_list(schema_name: str = None):
    args = ["pub-transform-config-v2", "list"]
    if schema_name:
        args.extend(["--schema-name", schema_name])
    return await _run(args, "edm-transform-list")


@router.get("/transform/active")
async def transform_active():
    return await _run(["pub-transform-config-v2", "get-active-metadatas"], "edm-transform-active")


@router.post("/transform/activate")
async def transform_activate(request: Request):
    d = await request.json()
    args = ["pub-transform-config-v2", "activate-metadata",
            "--source-name", d["sourceName"], "--source-version", d["sourceVersion"],
            "--target-name", d["targetName"], "--target-version", d["targetVersion"],
            "--source-api-version", d["sourceApiVersion"], "--tracking-version", d["trackingVersion"]]
    return await _run(args, "edm-transform-activate", d)


@router.post("/transform/delete")
async def transform_delete(request: Request):
    d = await request.json()
    args = ["pub-transform-config-v2", "delete-metadata",
            "--source-name", d["sourceName"], "--source-version", d["sourceVersion"],
            "--target-name", d["targetName"], "--target-version", d["targetVersion"],
            "--source-api-version", d["sourceApiVersion"]]
    return await _run(args, "edm-transform-delete", d)


# --- Publishing Destination Config (v2) ---

@router.get("/destination/list")
async def dest_list(customer_partition: str = None):
    args = ["pub-dest-config-v2", "list-partitions"]
    if customer_partition:
        args.extend(["--customer-partition", customer_partition])
    return await _run(args, "edm-dest-list")


@router.get("/destination/get")
async def dest_get(customer_partition: str = None):
    args = ["pub-dest-config-v2", "get-config"]
    if customer_partition:
        args.extend(["--customer-partition", customer_partition])
    return await _run(args, "edm-dest-get")


@router.post("/destination/add")
async def dest_add(request: Request):
    d = await request.json()
    args = ["pub-dest-config-v2", "add-config"]
    if d.get("customerPartition"):
        args.extend(["--customer-partition", d["customerPartition"]])
    return await _run(args, "edm-dest-add", d.get("payload"), stdin_json=d.get("payload"))


@router.delete("/destination/{partition}")
async def dest_delete(partition: str, file_type: str = None):
    args = ["pub-dest-config-v2", "delete-config", partition]
    if file_type:
        args.extend(["--file-type", file_type])
    return await _run(args, "edm-dest-delete", {"partition": partition, "fileType": file_type})


# --- Snapshot Publisher Destination Config ---

@router.get("/snapshot-dest/list")
async def snapshot_dest_list(customer_partition: str = None):
    args = ["snapshot-pub-dest-config", "list-partitions"]
    if customer_partition:
        args.extend(["--customer-partition", customer_partition])
    return await _run(args, "edm-snapshot-dest-list")


@router.get("/snapshot-dest/get")
async def snapshot_dest_get(customer_partition: str = None):
    args = ["snapshot-pub-dest-config", "get-config"]
    if customer_partition:
        args.extend(["--customer-partition", customer_partition])
    return await _run(args, "edm-snapshot-dest-get")


@router.post("/snapshot-dest/add")
async def snapshot_dest_add(request: Request):
    d = await request.json()
    args = ["snapshot-pub-dest-config", "add-config"]
    if d.get("customerPartition"):
        args.extend(["--customer-partition", d["customerPartition"]])
    return await _run(args, "edm-snapshot-dest-add", d.get("payload"), stdin_json=d.get("payload"))


@router.delete("/snapshot-dest/{partition}")
async def snapshot_dest_delete(partition: str, file_type: str = None):
    args = ["snapshot-pub-dest-config", "delete-config", partition]
    if file_type:
        args.extend(["--file-type", file_type])
    return await _run(args, "edm-snapshot-dest-delete", {"partition": partition, "fileType": file_type})


# --- ASN Schema (v2) ---

@router.get("/asn/list")
async def asn_list():
    return await _run(["pub-asn-schema-v2", "list"], "edm-asn-list")


@router.post("/asn/delete")
async def asn_delete(request: Request):
    d = await request.json()
    return await _run(["pub-asn-schema-v2", "delete-schema", "--schema-name", d["schemaName"]], "edm-asn-delete", d)


@router.get("/asn/get-all")
async def asn_get_all():
    return await _run(["pub-asn-schema-v2", "get-all-schemas"], "edm-asn-get-all")


# --- Publishing App Config (v2) ---

@router.get("/appconfig/get")
async def appconfig_get(key: str = None):
    args = ["pub-appconfig-v2", "get"]
    if key:
        args.extend(["--key", key])
    return await _run(args, "edm-appconfig-get")


@router.post("/appconfig/update")
async def appconfig_update(request: Request):
    d = await request.json()
    return await _run(["pub-appconfig-v2", "update"], "edm-appconfig-update", d, stdin_json=d)


# --- Snapshot Publisher App Config ---

@router.get("/snapshot-appconfig/get")
async def snapshot_appconfig_get(key: str = None):
    args = ["snapshot-pub-appconfig", "get"]
    if key:
        args.extend(["--key", key])
    return await _run(args, "edm-snapshot-appconfig-get")


@router.post("/snapshot-appconfig/update")
async def snapshot_appconfig_update(request: Request):
    d = await request.json()
    return await _run(["snapshot-pub-appconfig", "update"], "edm-snapshot-appconfig-update", d, stdin_json=d)


# --- Data Format Config (v2) ---

@router.get("/dataformat/get")
async def dataformat_get():
    return await _run(["pub-dataformatconfig-v2", "get"], "edm-dataformat-get")


@router.post("/dataformat/update")
async def dataformat_update(request: Request):
    d = await request.json()
    return await _run(["pub-dataformatconfig-v2", "update"], "edm-dataformat-update", d, stdin_json=d)


# --- Grouping Stale Removal ---

@router.get("/stale/status")
async def stale_status():
    return await _run(["pub-grouping-stale-entry", "status"], "edm-stale-status")


@router.post("/stale/remove")
async def stale_remove(request: Request):
    d = await request.json()
    args = ["pub-grouping-stale-entry", "remove", d["customerPartition"]]
    if d.get("customerId"): args.extend(["--customer-id", d["customerId"]])
    if d.get("sessionId"): args.extend(["--session-id", d["sessionId"]])
    if d.get("operationNumber"): args.extend(["--operation-number", str(d["operationNumber"])])
    if d.get("count"): args.extend(["--count", str(d["count"])])
    if d.get("force"): args.extend(["--force", "true"])
    return await _run(args, "edm-stale-remove", d)


@router.post("/stale/publish")
async def stale_publish(request: Request):
    d = await request.json()
    args = ["pub-grouping-stale-entry", "publish", d["customerPartition"]]
    if d.get("customerId"): args.extend(["--customer-id", d["customerId"]])
    if d.get("sessionId"): args.extend(["--session-id", d["sessionId"]])
    if d.get("operationNumber"): args.extend(["--operation-number", str(d["operationNumber"])])
    if d.get("count"): args.extend(["--count", str(d["count"])])
    if d.get("force"): args.extend(["--force", "true"])
    return await _run(args, "edm-stale-publish", d)
