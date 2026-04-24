from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, rfq_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.setdefault(rfq_id, [])
        connections.append(websocket)

    def disconnect(self, rfq_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(rfq_id)
        if connections and websocket in connections:
            connections.remove(websocket)
            if not connections:
                self.active_connections.pop(rfq_id, None)

    async def broadcast(self, rfq_id: str, message: dict) -> None:
        connections = self.active_connections.get(rfq_id, [])
        for connection in connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(rfq_id, connection)


manager = ConnectionManager()


@router.websocket("/ws/rfq/{rfq_id}")
async def rfq_websocket(rfq_id: str, websocket: WebSocket):
    await websocket.accept()
    await manager.connect(rfq_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(rfq_id, websocket)
