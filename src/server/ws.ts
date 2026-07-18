import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage, Server } from "http";
import type {
    ClientMessage,
    ServerMessage,
    SyncClient,
    SyncRoom,
} from "./types.js";
import {
    createRoom,
    joinRoom,
    leaveRoom,
    removeClient,
    updateHostState,
    getRoomByClientId,
    logRoomMessage,
    initRoomLog,
    cleanupRoomLog,
    setRoomHideId,
} from "./room.js";

const log = (msg: string, ...args: unknown[]) => {
    console.log(`[TidalSync] ${msg}`, ...args);
};

const send = (ws: WebSocket, msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
};

const broadcastToGuests = (room: SyncRoom, msg: ServerMessage, excludeId?: string) => {
    for (const guest of room.guests.values()) {
        if (guest.id !== excludeId) {
            send(guest.ws, msg);
        }
    }
};

const handleMessage = (client: SyncClient, raw: string) => {
    let msg: ClientMessage;
    try {
        msg = JSON.parse(raw);
    } catch {
        send(client.ws, { type: "error", error: "Invalid JSON" });
        return;
    }

    const room = getRoomByClientId(client.id);

    if (room) {
        logRoomMessage(room.id, {
            ts: Date.now(),
            dir: "in",
            clientId: client.id,
            clientName: client.displayName,
            role: client.role,
            type: msg.type,
            payload: msg,
        });
    }

    switch (msg.type) {
        case "create": {
            const createdRoom = createRoom(client);
            client.displayName = msg.displayName || "Host";
            initRoomLog(createdRoom.id);
            send(client.ws, { type: "created", roomId: createdRoom.id });
            logRoomMessage(createdRoom.id, {
                ts: Date.now(),
                dir: "out",
                clientId: "server",
                clientName: "Server",
                role: "host",
                type: "created",
                payload: { roomId: createdRoom.id },
            });
            log(`Room ${createdRoom.id} created by ${client.displayName}`);
            break;
        }

        case "join": {
            const joinedRoom = joinRoom(msg.roomId, client);
            if (!room) break;
            if (!joinedRoom) {
                send(client.ws, { type: "error", error: `Room ${msg.roomId} not found` });
                return;
            }
            client.displayName = msg.displayName || "Guest";
            send(client.ws, {
                type: "joined",
                roomId: joinedRoom.id,
                role: "guest",
            });
            send(client.ws, { type: "host_sync", state: joinedRoom.hostState });
            send(joinedRoom.host.ws, {
                type: "guest_joined",
                displayName: client.displayName,
                guestCount: joinedRoom.guests.size,
            });

            logRoomMessage(joinedRoom.id, {
                ts: Date.now(),
                dir: "out",
                clientId: "server",
                clientName: "Server",
                role: "host",
                type: "guest_joined",
                payload: { displayName: client.displayName, guestCount: joinedRoom.guests.size },
            });

            log(`${client.displayName} joined room ${joinedRoom.id} (${joinedRoom.guests.size} guests)`);
            break;
        }

        case "leave": {
            if (!room) break;
            const guestCount = room.guests.size;
            leaveRoom(client);
            if (client.role === "host") {
                cleanupRoomLog(room.id);
                log(`Host left room ${room.id} — room dissolved`);
            } else {
                send(room.host.ws, {
                    type: "guest_left",
                    displayName: client.displayName,
                    guestCount: guestCount - 1,
                });
                logRoomMessage(room.id, {
                    ts: Date.now(),
                    dir: "out",
                    clientId: "server",
                    clientName: "Server",
                    role: "host",
                    type: "guest_left",
                    payload: { displayName: client.displayName, guestCount: guestCount - 1 },
                });
                log(`${client.displayName} left room ${room.id}`);
            }
            break;
        }

        case "state": {
            if (!room || room.host.id !== client.id) break;

            updateHostState(room.id, msg.state);
            broadcastToGuests(room, { type: "state", state: msg.state });
            logRoomMessage(room.id, {
                ts: Date.now(),
                dir: "out",
                clientId: "server",
                clientName: "Server",
                role: "guest",
                type: "state",
                payload: msg.state,
            });
            break;
        }

        case "command": {
            if (!room) break;

            if (client.role === "guest") {
                send(room.host.ws, {
                    type: "command",
                    command: msg.command,
                });
                logRoomMessage(room.id, {
                    ts: Date.now(),
                    dir: "out",
                    clientId: "server",
                    clientName: "Server",
                    role: "host",
                    type: "command",
                    payload: msg.command,
                });
            } else if (client.role === "host") {
                broadcastToGuests(room, { type: "command", command: msg.command });
                logRoomMessage(room.id, {
                    ts: Date.now(),
                    dir: "out",
                    clientId: "server",
                    clientName: "Server",
                    role: "guest",
                    type: "command",
                    payload: msg.command,
                });
            }
            break;
        }

        case "hideId": {
            if (room && client.role === "host") {
                setRoomHideId(room.id, msg.hide);
            }
            break;
        }

        case "heartbeat": {
            client.lastHeartbeat = Date.now();
            if (room && client.role === "host") {
                updateHostState(room.id, {
                    currentTime: msg.currentTime,
                    playing: msg.playing,
                });
                broadcastToGuests(room, {
                    type: "host_sync",
                    state: room.hostState,
                });
            }
            send(client.ws, { type: "pong", currentTime: Date.now() });
            break;
        }
    }
};

const handleConnection = (ws: WebSocket, _req: IncomingMessage) => {
    const id = Math.random().toString(36).slice(2, 10);
    const client: SyncClient = {
        ws,
        id,
        displayName: "Unknown",
        role: "guest",
        lastHeartbeat: Date.now(),
    };

    log(`Client connected: ${id}`);

    ws.on("message", (data) => {
        handleMessage(client, data.toString());
    });

    ws.on("close", () => {
        const room = getRoomByClientId(client.id);
        if (room) {
            if (client.role === "host") {
                for (const guest of room.guests.values()) {
                    send(guest.ws, { type: "error", error: "Host disconnected" });
                    guest.ws.close(1000, "Host disconnected");
                }
            } else {
                send(room.host.ws, {
                    type: "guest_left",
                    displayName: client.displayName,
                    guestCount: room.guests.size - 1,
                });
            }
        }
        removeClient(client);
        log(`Client disconnected: ${id} (${client.displayName})`);
    });

    ws.on("error", (err) => {
        log(`Client error ${id}: ${err.message}`);
    });
};

export const attachWebSocket = (server: Server): WebSocketServer => {
    const wss = new WebSocketServer({ server });
    wss.on("connection", handleConnection);
    log("WebSocket server attached");
    return wss;
};
