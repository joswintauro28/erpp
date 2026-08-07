"""WebSocket gateway for live notifications.

Clients connect to `ws://<host>:8000/ws/notifications?token=<jwt>` using the
same access token issued by core-iam. The connection registers the caller's
user_id + role + full name so broadcasts can be fanned out to a specific user,
a role, or a name match.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token

logger = logging.getLogger("app.notification.websocket")

router = APIRouter(tags=["notifications-ws"])


class ConnectionManager:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        # user_id -> list of (websocket, meta)
        self._by_user: dict[int, list[tuple[WebSocket, dict]]] = {}

    async def connect(self, websocket: WebSocket, *, user_id: int, role: str, name: str) -> None:
        meta = {"user_id": user_id, "role": role, "name": name}
        async with self._lock:
            self._by_user.setdefault(user_id, []).append((websocket, meta))
        logger.info(f"WS connected: user {user_id} ({role}) — {len(self._by_user.get(user_id, []))} socket(s)")

    async def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        async with self._lock:
            sockets = self._by_user.get(user_id, [])
            self._by_user[user_id] = [(ws, m) for ws, m in sockets if ws is not websocket]
            if not self._by_user[user_id]:
                self._by_user.pop(user_id, None)
        logger.info(f"WS disconnected: user {user_id}")

    def _users_matching(self, *, user_id: int | None = None, role: str | None = None, name: str | None = None) -> list[tuple[WebSocket, dict]]:
        matches = []
        for uid, sockets in self._by_user.items():
            for ws, meta in sockets:
                if user_id is not None and meta["user_id"] == user_id:
                    matches.append((ws, meta))
                    continue
                if role and meta.get("role", "").lower() == role.lower():
                    matches.append((ws, meta))
                    continue
                if name and name.strip() and meta.get("name", "").strip().lower() == name.strip().lower():
                    matches.append((ws, meta))
        return matches

    async def broadcast_payload(self, payload: dict, *, user_id: int | None = None, role: str | None = None, name: str | None = None) -> int:
        """Send `payload` to every matching socket. Returns count delivered."""
        sockets = self._users_matching(user_id=user_id, role=role, name=name)
        if not sockets:
            return 0
        message = json.dumps(payload, default=str)
        delivered = 0
        for ws, meta in sockets:
            try:
                await ws.send_text(message)
                delivered += 1
            except Exception:
                logger.warning(f"WS send failed for user {meta.get('user_id')} — dropping socket")
                await self.disconnect(ws, meta.get("user_id", 0))
        return delivered

    async def broadcast(self, payload: dict) -> int:
        total = 0
        for uid in list(self._by_user.keys()):
            total += await self.broadcast_payload(payload, user_id=uid)
        return total


manager = ConnectionManager()


def _decode_ws_token(token: str | None) -> dict:
    """Validate the JWT passed as ?token=. Raises on invalid/missing."""
    if not token:
        raise ValueError("Missing token")
    payload = decode_access_token(token)
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    token = websocket.query_params.get("token")
    try:
        payload = _decode_ws_token(token)
    except Exception as exc:
        await websocket.close(code=4401)
        logger.warning(f"WS auth rejected: {exc}")
        return

    user_id = int(payload.get("user_id") or payload.get("sub") or 0)
    role = str(payload.get("role") or "")
    name = str(payload.get("full_name") or payload.get("email") or "")

    await websocket.accept()
    await manager.connect(websocket, user_id=user_id, role=role, name=name)

    # Greeting so the client can confirm the live pipe is open.
    try:
        await websocket.send_json({"event": "connected", "message": "notification stream ready"})
    except Exception:
        pass

    try:
        while True:
            # Clients may send a keep-alive ping; ignore the content.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
    except Exception as exc:
        logger.warning(f"WS error for user {user_id}: {exc}")
        await manager.disconnect(websocket, user_id)


# Internal helper used by the consumer: emit a notification to targeted sockets.
async def push_live_notification(notification: dict) -> int:
    payload = {
        "event": "notification.created",
        "notification": notification,
    }
    return await manager.broadcast_payload(
        payload,
        user_id=notification.get("user_id"),
        role=notification.get("role"),
        name=notification.get("target_name"),
    )
