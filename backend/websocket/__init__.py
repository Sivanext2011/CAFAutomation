import asyncio
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self._connections:
            self._connections[job_id] = set()
        self._connections[job_id].add(websocket)

    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self._connections:
            self._connections[job_id].discard(websocket)
            if not self._connections[job_id]:
                del self._connections[job_id]

    async def send_to_job(self, job_id: str, message: str):
        if job_id in self._connections:
            dead = set()
            for ws in self._connections[job_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self._connections[job_id].discard(ws)

    async def broadcast(self, message: str):
        for job_id in list(self._connections.keys()):
            await self.send_to_job(job_id, message)


manager = ConnectionManager()
