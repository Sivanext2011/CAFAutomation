from fastapi import APIRouter, Request
from backend.executor import execute_command

router = APIRouter(prefix="/api/alarms", tags=["alarms"])


async def _run(command_args: list, operation: str, input_payload: dict = None):
    job = await execute_command(
        command_args=command_args,
        operation=operation,
        input_payload=input_payload,
        cli="bamctl",
    )
    return {"status": job.status, "job": job.model_dump()}


@router.get("/list")
async def list_all_alarms(outputformat: str = None):
    args = ["alarms", "list-all-alarms"]
    if outputformat:
        args.append(f"--outputformat={outputformat}")
    return await _run(args, "alarms-list-all")


@router.post("/get")
async def get_alarm(request: Request):
    data = await request.json()
    args = ["alarms", "get-alarm", data["alarmName"], data["serviceName"]]
    if data.get("faultyResource"):
        args.extend(["--faultyresource", data["faultyResource"]])
    if data.get("outputformat"):
        args.append(f"--outputformat={data['outputformat']}")
    return await _run(args, "alarms-get-alarm", data)


@router.post("/clear")
async def clear_alarm(request: Request):
    data = await request.json()
    args = ["alarms", "clear-alarm", data["alarmName"], data["serviceName"]]
    if data.get("faultyResource"):
        args.extend(["--faultyresource", data["faultyResource"]])
    return await _run(args, "alarms-clear-alarm", data)
