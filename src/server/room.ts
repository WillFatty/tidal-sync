import { randomBytes } from "crypto";
import type { SyncClient, SyncRoom, PlaybackState } from "./types.js";
import { emptyPlaybackState } from "./types.js";

export interface RoomMessage {
    ts: number;
    dir: "in" | "out";
    clientId: string;
    clientName: string;
    role: "host" | "guest";
    type: string;
    payload: unknown;
}

const rooms = new Map<string, SyncRoom>();
const roomLogs = new Map<string, RoomMessage[]>();
const roomListeners = new Map<string, Set<(msg: RoomMessage) => void>>();

const generateRoomId = (): string => {
    return randomBytes(4).toString("hex").toUpperCase();
};

export const createRoom = (host: SyncClient): SyncRoom => {
    const id = generateRoomId();
    const room: SyncRoom = {
        id,
        host,
        guests: new Map(),
        hostState: emptyPlaybackState(),
        createdAt: Date.now(),
        hideId: false,
    };
    rooms.set(id, room);
    host.role = "host";
    return room;
};

export const getRoom = (id: string): SyncRoom | undefined => {
    return rooms.get(id);
};

export const joinRoom = (roomId: string, guest: SyncClient): SyncRoom | null => {
    const room = rooms.get(roomId);
    if (!room) return null;

    guest.role = "guest";
    room.guests.set(guest.id, guest);
    return room;
};

export const leaveRoom = (client: SyncClient): void => {
    for (const room of rooms.values()) {
        if (room.host.id === client.id) {
            for (const guest of room.guests.values()) {
                guest.ws.close(1000, "Host disconnected");
            }
            rooms.delete(room.id);
            return;
        }
    }

    for (const room of rooms.values()) {
        if (room.guests.has(client.id)) {
            room.guests.delete(client.id);
            return;
        }
    }
};

export const removeClient = (client: SyncClient): void => {
    leaveRoom(client);
};

export const updateHostState = (roomId: string, state: Partial<PlaybackState>): void => {
    const room = rooms.get(roomId);
    if (!room) return;
    Object.assign(room.hostState, state);
};

export const getHostState = (roomId: string): PlaybackState | null => {
    const room = rooms.get(roomId);
    return room ? room.hostState : null;
};

export const getRoomByClientId = (clientId: string): SyncRoom | null => {
    for (const r of rooms.values()) {
        if (r.host.id === clientId) return r;
        if (r.guests.has(clientId)) return r;
    }
    return null;
};

export const getActiveRooms = (): Array<{
    id: string;
    host: string;
    guests: number;
    createdAt: number;
    track: string | null;
    trackArtists: string[] | null;
    coverUrl: string | null;
    playing: boolean;
}> => {
    return Array.from(rooms.values()).map((room) => ({
            id: room.hideId ? "***" : room.id,
        host: room.host.displayName,
        guests: room.guests.size,
        createdAt: room.createdAt,
        track: room.hostState.trackTitle,
        trackArtists: room.hostState.trackArtists,
        coverUrl: room.hostState.coverUrl,
        playing: room.hostState.playing,
    }));
};

export const getRoomCount = (): number => rooms.size;

const MAX_LOG = 200;

export const logRoomMessage = (roomId: string, msg: RoomMessage) => {
    const logs = roomLogs.get(roomId);
    if (logs) {
        logs.push(msg);
        if (logs.length > MAX_LOG) logs.splice(0, logs.length - MAX_LOG);
    }
    const listeners = roomListeners.get(roomId);
    if (listeners) {
        for (const fn of listeners) fn(msg);
    }
};

export const getRoomLogs = (roomId: string): RoomMessage[] => {
    return roomLogs.get(roomId) ?? [];
};

export const initRoomLog = (roomId: string) => {
    if (!roomLogs.has(roomId)) roomLogs.set(roomId, []);
};

export const cleanupRoomLog = (roomId: string) => {
    roomLogs.delete(roomId);
    roomListeners.delete(roomId);
};

export const addRoomListener = (roomId: string, fn: (msg: RoomMessage) => void): (() => void) => {
    if (!roomListeners.has(roomId)) roomListeners.set(roomId, new Set());
    roomListeners.get(roomId)!.add(fn);
    return () => { roomListeners.get(roomId)?.delete(fn); };
};

export const setRoomHideId = (roomId: string, hide: boolean): void => {
    const room = rooms.get(roomId);
    if (room) room.hideId = hide;
};

export const getRoomDetail = (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return null;
    return {
        id: room.hideId ? "***" : room.id,
        createdAt: room.createdAt,
        host: {
            id: room.host.id,
            displayName: room.host.displayName,
            lastHeartbeat: room.host.lastHeartbeat,
        },
        guests: Array.from(room.guests.values()).map((g) => ({
            id: g.id,
            displayName: g.displayName,
            lastHeartbeat: g.lastHeartbeat,
        })),
        hostState: room.hostState,
    };
};
