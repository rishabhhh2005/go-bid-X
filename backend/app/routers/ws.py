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


import logging

logger = logging.getLogger(__name__)


@router.websocket("/ws/rfq/{rfq_id}")
async def rfq_websocket(rfq_id: str, websocket: WebSocket):
    logger.info(f"WebSocket connection attempt for RFQ: {rfq_id}")
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for RFQ: {rfq_id}")
    await manager.connect(rfq_id, websocket)
    try:
        while True:
            # Keep the connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for RFQ: {rfq_id}")
        manager.disconnect(rfq_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(rfq_id, websocket)
