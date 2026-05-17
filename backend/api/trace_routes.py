from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/trace", tags=["trace-management"])


async def _run(command_args: list, operation: str, input_payload: dict = None, stdin_json=None):
    job = await execute_command(
        command_args=["trace-management"] + command_args,
        operation=operation,
        input_payload=input_payload,
        stdin_json=stdin_json,
        cli="bamctl",
    )
    return {"status": job.status, "job": job.model_dump()}


@router.get("/jobs")
async def list_jobs(interface: str = None, criteria_type: str = None):
    args = ["list-trace-jobs"]
    if interface:
        args.extend(["--interface", interface])
    if criteria_type:
        args.extend(["--criteria-type", criteria_type])
    return await _run(args, "trace-list-jobs")


@router.get("/jobs/{trace_id}")
async def get_job(trace_id: str):
    return await _run(["get-trace-job", trace_id], "trace-get-job", {"traceId": trace_id})


@router.post("/jobs")
async def create_job(request: Request):
    data = await request.json()
    return await _run(["create-trace-job"], "trace-create-job", data, stdin_json=data)


@router.delete("/jobs/{trace_id}")
async def delete_job(trace_id: str):
    return await _run(["delete-trace-job", trace_id], "trace-delete-job", {"traceId": trace_id})


@router.post("/jobs/{trace_id}/start")
async def start_job(trace_id: str):
    return await _run(["start-trace-job", trace_id], "trace-start-job", {"traceId": trace_id})


@router.post("/jobs/{trace_id}/stop")
async def stop_job(trace_id: str):
    return await _run(["stop-trace-job", trace_id], "trace-stop-job", {"traceId": trace_id})


@router.get("/jobs/{trace_id}/logs")
async def get_logs(trace_id: str):
    return await _run(["get-trace-logs", trace_id, "-p"], "trace-get-logs", {"traceId": trace_id})


@router.post("/delete-by-interface")
async def delete_by_interface(request: Request):
    data = await request.json()
    args = ["delete-trace-jobs", data["interface"]]
    if data.get("criteriaType"):
        args.extend(["--criteria-type", data["criteriaType"]])
    return await _run(args, "trace-delete-by-interface", data)


@router.get("/config")
async def get_config():
    return await _run(["get-trace-config"], "trace-get-config")


@router.post("/config")
async def update_config(request: Request):
    data = await request.json()
    parts = []
    if data.get("activeTraceJobsThreshold"):
        parts.append(f".activeTraceJobsThreshold:{data['activeTraceJobsThreshold']}")
    if data.get("inactiveJobsRetentionPeriod"):
        parts.append(f".inactiveJobsRetentionPeriod:{data['inactiveJobsRetentionPeriod']}")
    if data.get("traceLogsSize"):
        parts.append(f".traceLogsSize:{data['traceLogsSize']}")
    args = ["update-trace-config", ",".join(parts)] if parts else ["update-trace-config"]
    return await _run(args, "trace-update-config", data)
