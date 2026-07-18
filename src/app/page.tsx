"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ActiveRoom {
    id: string;
    host: string;
    guests: number;
    createdAt: number;
    track: string | null;
    trackArtists: string[] | null;
    coverUrl: string | null;
    playing: boolean;
}

interface ServerStatus {
    status: string;
    rooms: number;
    activeRooms: ActiveRoom[];
    uptime: number;
}

interface RoomMessage {
    ts: number;
    dir: "in" | "out";
    clientId: string;
    clientName: string;
    role: "host" | "guest";
    type: string;
    payload: unknown;
}

interface RoomDetail {
    id: string;
    createdAt: number;
    host: { id: string; displayName: string; lastHeartbeat: number };
    guests: Array<{ id: string; displayName: string; lastHeartbeat: number }>;
    hostState: Record<string, unknown>;
    messages: RoomMessage[];
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function timeAgo(createdAt: number): string {
    const diff = Math.floor((Date.now() - createdAt) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function EqBars({ playing }: { playing: boolean }) {
    return (
        <div className={`eq-bars ${playing ? "" : "paused"}`} aria-hidden>
            <span />
            <span />
            <span />
            <span />
        </div>
    );
}

function WaveMark() {
    return (
        <svg className="block h-7 w-7 text-[var(--accent)]" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path
                d="M2 14c3-6 6-6 9 0s6 6 9 0 6-6 9 0"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <path
                d="M2 20c3-5 6-5 9 0s6 5 9 0 6-5 9 0"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity="0.4"
            />
        </svg>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-28 px-6 animate-fade-up">
            <div className="animate-float mb-8">
                <div className="relative flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-[var(--accent)]/10 blur-2xl" />
                    <div className="relative surface grid h-20 w-20 place-items-center rounded-full leading-none">
                        <WaveMark />
                    </div>
                </div>
            </div>
            <h3
                className="mb-2 text-2xl font-semibold text-[var(--foam)]"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
                Quiet waters
            </h3>
            <p className="max-w-sm text-center text-[var(--mist)] leading-relaxed">
                Start a TidalSync session in TidaLuna — rooms surface here the moment someone connects.
            </p>
        </div>
    );
}

function RoomCard({ room, onClick, index }: { room: ActiveRoom; onClick: () => void; index: number }) {
    return (
        <button
            onClick={onClick}
            className={`group surface animate-fade-up text-left w-full cursor-pointer rounded-2xl p-6 transition-all duration-300 hover:border-[rgba(232,93,122,0.3)] hover:bg-[rgba(36,20,26,0.9)] stagger-${Math.min(index + 1, 3)} ${
                room.playing ? "surface-live" : ""
            }`}
        >
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    {room.playing ? (
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-[var(--accent)] opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                        </span>
                    ) : (
                        <span className="h-2 w-2 rounded-full bg-[var(--muted)]" />
                    )}
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--mist)]">
                        {room.playing ? "Live" : "Paused"}
                    </span>
                </div>
                <span className="text-xs text-[var(--muted)]">{timeAgo(room.createdAt)}</span>
            </div>

            <div className="mb-5">
                <div
                    className="mb-1 text-3xl font-bold tracking-[0.18em] text-[var(--foam)]"
                    style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
                >
                    {room.id}
                </div>
                <div className="text-sm text-[var(--muted)]">
                    Hosted by <span className="text-[var(--mist)]">{room.host}</span>
                </div>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-xl bg-black/20 px-3.5 py-2.5">
                {room.coverUrl ? (
                    <img
                        src={room.coverUrl}
                        alt=""
                        className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                    />
                ) : (
                    <EqBars playing={room.playing} />
                )}
                <div className="min-w-0">
                    <span
                        className={`block truncate text-sm ${
                            room.track ? "text-[var(--foam)]" : "italic text-[var(--muted)]"
                        }`}
                    >
                        {room.track ?? "No track playing"}
                    </span>
                    {room.trackArtists && room.trackArtists.length > 0 && (
                        <span className="block truncate text-xs text-[var(--muted)]">
                            {room.trackArtists.join(", ")}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--line)] pt-4">
                <span className="text-xs text-[var(--muted)]">
                    {room.guests} {room.guests === 1 ? "listener" : "listeners"}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                    Open
                </span>
            </div>
        </button>
    );
}

function msgLabel(type: string): string {
    const labels: Record<string, string> = {
        state: "STATE",
        command: "CMD",
        host_sync: "SYNC",
        heartbeat: "HEART",
        pong: "PONG",
        created: "CREATED",
        joined: "JOINED",
        guest_joined: "+GUEST",
        guest_left: "-GUEST",
        play: "PLAY",
        pause: "PAUSE",
        next: "NEXT",
        previous: "PREV",
        seek: "SEEK",
        shuffle: "SHUFFLE",
        repeat: "REPEAT",
        error: "ERR",
    };
    return labels[type] ?? type.toUpperCase();
}

function msgColor(type: string, dir: "in" | "out"): string {
    if (type === "error") return "text-[var(--danger)]";
    if (type === "guest_joined" || type === "joined" || type === "created") return "text-[var(--accent)]";
    if (type === "guest_left") return "text-[var(--warn)]";
    if (dir === "in") return "text-rose-300";
    return "text-pink-200";
}

function truncatePayload(msg: RoomMessage): string {
    const p = msg.payload as Record<string, unknown>;
    if (msg.type === "state") {
        const s = p.state as Record<string, unknown> | undefined;
        if (s?.trackTitle)
            return `${s.trackTitle}${s.playing !== undefined ? (s.playing ? " ▶" : " ⏸") : ""}`;
        if (s?.playing !== undefined) return s.playing ? "▶ Playing" : "⏸ Paused";
        if (s?.currentTime !== undefined) return `${Number(s.currentTime).toFixed(1)}s`;
        if (s?.shuffle !== undefined) return `shuffle ${s.shuffle ? "on" : "off"}`;
        if (s?.repeatMode !== undefined) return `repeat ${s.repeatMode}`;
        return JSON.stringify(s ?? p).slice(0, 80);
    }
    if (msg.type === "command") {
        const c = p.command as Record<string, unknown> | undefined;
        if (c) {
            const args = Object.entries(c)
                .filter(([k]) => k !== "type")
                .map(([k, v]) => `${k}=${v}`)
                .join(" ");
            return `${c.type}${args ? " " + args : ""}`;
        }
    }
    if (msg.type === "heartbeat")
        return `${Number(p.currentTime ?? 0).toFixed(1)}s ${p.playing ? "▶" : "⏸"}`;
    if (msg.type === "host_sync") {
        const s = p.state as Record<string, unknown> | undefined;
        return s?.trackTitle ? String(s.trackTitle) : "sync";
    }
    if (msg.type === "guest_joined") return `${p.displayName} joined (${p.guestCount})`;
    if (msg.type === "guest_left") return `${p.displayName} left (${p.guestCount})`;
    if (msg.type === "created") return `Room ${p.roomId}`;
    return JSON.stringify(p).slice(0, 80);
}

function RoomDetailView({ roomId, onBack }: { roomId: string; onBack: () => void }) {
    const [detail, setDetail] = useState<RoomDetail | null>(null);
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const logRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
                if (res.ok) {
                    const data: RoomDetail = await res.json();
                    setDetail(data);
                    setMessages(data.messages ?? []);
                }
            } catch {
                /* ignore */
            }
        };
        poll();
        const interval = setInterval(poll, 1500);
        return () => clearInterval(interval);
    }, [roomId]);

    useEffect(() => {
        if (autoScroll && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [messages, autoScroll]);

    const handleScroll = () => {
        if (!logRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = logRef.current;
        setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
    };

    if (!detail) {
        return (
            <div className="surface rounded-2xl p-12 text-center">
                <span className="text-[var(--muted)]">Loading room…</span>
            </div>
        );
    }

    const now = Date.now();
    const hostOnline = now - detail.host.lastHeartbeat < 15000;

    return (
        <div className="space-y-5 animate-fade-up">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foam)]"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                All rooms
            </button>

            <div className="surface rounded-2xl p-7">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <div
                            className="mb-1 text-3xl font-bold tracking-[0.18em] text-[var(--foam)] md:text-4xl"
                            style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
                        >
                            {detail.id}
                        </div>
                        <div className="text-sm text-[var(--muted)]">Created {timeAgo(detail.createdAt)}</div>
                    </div>
                    <div
                        className={`text-xs font-medium tracking-wide ${
                            hostOnline ? "text-[var(--accent)]" : "text-[var(--danger)]"
                        }`}
                    >
                        {hostOnline ? "Host online" : "Host offline"}
                    </div>
                </div>

                {detail.hostState?.trackTitle && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl bg-black/25 px-3.5 py-3">
                        {detail.hostState.coverUrl ? (
                            <img
                                src={String(detail.hostState.coverUrl)}
                                alt=""
                                className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                            />
                        ) : (
                            <EqBars playing={Boolean(detail.hostState.playing)} />
                        )}
                        <div className="min-w-0">
                            <span className="block truncate text-sm text-[var(--foam)]">
                                {String(detail.hostState.trackTitle)}
                            </span>
                            {detail.hostState.trackArtists && Array.isArray(detail.hostState.trackArtists) && detail.hostState.trackArtists.length > 0 && (
                                <span className="block truncate text-xs text-[var(--muted)]">
                                    {detail.hostState.trackArtists.join(", ")}
                                </span>
                            )}
                        </div>
                        {typeof detail.hostState.currentTime === "number" && (
                            <span className="ml-auto text-xs tabular-nums text-[var(--muted)]">
                                {Math.floor(Number(detail.hostState.currentTime))}s
                            </span>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
                    <div>
                        <div className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                            Host
                        </div>
                        <div className="text-[var(--foam)]">{detail.host.displayName}</div>
                        <div className="font-mono text-xs text-[var(--muted)]">{detail.host.id}</div>
                    </div>
                    <div>
                        <div className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                            Guests ({detail.guests.length})
                        </div>
                        {detail.guests.length > 0 ? (
                            detail.guests.map((g) => (
                                <div key={g.id} className="mb-2">
                                    <div className="text-[var(--foam)]">{g.displayName}</div>
                                    <div className="font-mono text-xs text-[var(--muted)]">{g.id}</div>
                                </div>
                            ))
                        ) : (
                            <div className="italic text-[var(--muted)]">No guests</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="surface overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mist)]">
                        Live messages
                    </h3>
                    <span className="text-[11px] text-[var(--muted)]">{messages.length}</span>
                </div>
                <div
                    ref={logRef}
                    onScroll={handleScroll}
                    className="log-scroll overflow-y-auto font-mono text-[11px] leading-relaxed"
                    style={{ height: "500px", background: "rgba(0,0,0,0.28)" }}
                >
                    {messages.length === 0 ? (
                        <div className="p-8 text-center text-[var(--muted)]">No messages yet…</div>
                    ) : (
                        messages.map((msg, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-2 border-b border-white/[0.02] px-4 py-1.5 hover:bg-white/[0.02]"
                            >
                                <span className="shrink-0 tabular-nums text-[var(--muted)]">
                                    {formatTime(msg.ts)}
                                </span>
                                <span
                                    className={`shrink-0 font-bold ${
                                        msg.dir === "in" ? "text-rose-300" : "text-pink-200"
                                    }`}
                                >
                                    {msg.dir === "in" ? "←" : "→"}
                                </span>
                                <span
                                    className={`w-14 shrink-0 text-right font-bold ${msgColor(msg.type, msg.dir)}`}
                                >
                                    {msgLabel(msg.type)}
                                </span>
                                <span className="shrink-0 text-[var(--muted)]">{msg.clientName}</span>
                                <span className="truncate text-[var(--mist)]">{truncatePayload(msg)}</span>
                            </div>
                        ))
                    )}
                </div>
                {!autoScroll && (
                    <button
                        onClick={() => {
                            setAutoScroll(true);
                            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
                        }}
                        className="w-full bg-[var(--accent-soft)] py-2 text-xs text-[var(--accent)] transition-colors hover:bg-[rgba(232,93,122,0.2)]"
                    >
                        Jump to latest
                    </button>
                )}
            </div>
        </div>
    );
}

function StatusStrip({
    isOnline,
    rooms,
    uptime,
    listeners,
    fetchTime,
}: {
    isOnline: boolean;
    rooms: number;
    uptime: number;
    listeners: number;
    fetchTime: number;
}) {
    const items = [
        { label: isOnline ? "Online" : "Offline", value: null as string | null, live: isOnline },
        { label: "Rooms", value: String(rooms) },
        ...(isOnline ? [{ label: "Uptime", value: formatUptime(uptime) }] : []),
        { label: "Listeners", value: String(listeners) },
        ...(isOnline ? [{ label: "Ping", value: `${fetchTime}ms` }] : []),
    ];

    return (
        <div className="surface animate-fade-up stagger-2 mx-auto mb-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl px-6 py-4">
            {items.map((item, i) => (
                <div key={item.label} className="flex items-center gap-2.5">
                    {i === 0 && (
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${
                                item.live ? "bg-[var(--accent)]" : "bg-[var(--danger)]"
                            }`}
                        />
                    )}
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {item.label}
                    </span>
                    {item.value !== null && (
                        <span className="text-sm font-medium tabular-nums text-[var(--foam)]">
                            {item.value}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const [status, setStatus] = useState<ServerStatus | null>(null);
    const [fetchTime, setFetchTime] = useState<number>(0);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const start = performance.now();
            const res = await fetch("/api/status", { cache: "no-store" });
            const elapsed = performance.now() - start;
            const data = await res.json();
            setStatus(data);
            setFetchTime(Math.round(elapsed));
        } catch {
            setStatus((prev) => (prev ? { ...prev, status: "offline" } : null));
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const isOnline = status?.status === "ok";
    const listeners = status?.activeRooms?.reduce((sum, r) => sum + r.guests, 0) ?? 0;

    return (
        <div className="relative min-h-screen">
            <div className="ocean-field" aria-hidden>
                <div className="ocean-wave" style={{ top: "15%" }} />
                <div className="ocean-wave" />
                <div className="ocean-wave" />
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
                <header className="mb-12 text-center animate-fade-up">
                    <div className="mb-6 flex justify-center">
                        <div className="relative flex h-14 w-14 items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-[var(--accent)]/20 blur-xl" />
                            <div className="relative surface grid h-12 w-12 place-items-center rounded-full leading-none">
                                <WaveMark />
                            </div>
                        </div>
                    </div>
                    <h1 className="brand-mark mb-5 text-6xl font-extrabold leading-[0.95] md:text-7xl lg:text-8xl">
                        TidalSync
                    </h1>
                    <p className="mx-auto max-w-md text-lg font-light tracking-wide text-[var(--mist)]">
                        Listen to TIDAL together, in sync
                    </p>
                </header>

                {!selectedRoom && (
                    <StatusStrip
                        isOnline={isOnline}
                        rooms={status?.rooms ?? 0}
                        uptime={status?.uptime ?? 0}
                        listeners={listeners}
                        fetchTime={fetchTime}
                    />
                )}

                <section>
                    {selectedRoom ? (
                        <RoomDetailView roomId={selectedRoom} onBack={() => setSelectedRoom(null)} />
                    ) : (
                        <>
                            <div className="mb-6 flex items-end justify-between">
                                <h2
                                    className="text-xl font-semibold text-[var(--foam)]"
                                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                                >
                                    Active rooms
                                </h2>
                            </div>

                            {!isOnline ? (
                                <div className="surface animate-fade-up rounded-2xl px-8 py-16 text-center">
                                    <div className="mb-5 flex justify-center">
                                        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)] leading-none [&>svg]:block">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" />
                                            </svg>
                                        </span>
                                    </div>
                                    <p className="mb-2 text-lg font-medium text-[var(--foam)]">Could not reach server</p>
                                    <p className="text-sm text-[var(--mist)]">
                                        Make sure the TidalSync server is running on port 24124
                                    </p>
                                </div>
                            ) : status?.activeRooms && status.activeRooms.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {status.activeRooms.map((room, i) => (
                                        <RoomCard
                                            key={room.id}
                                            room={room}
                                            index={i}
                                            onClick={() => setSelectedRoom(room.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState />
                            )}
                        </>
                    )}
                </section>

                {!selectedRoom && (
                    <footer className="mt-24 animate-fade-up stagger-3 border-t border-[var(--line)] pt-16">
                        <div className="mb-12 max-w-xl">
                            <h3
                                className="mb-3 text-3xl font-bold tracking-tight text-[var(--foam)] md:text-4xl"
                                style={{ fontFamily: "var(--font-display), sans-serif" }}
                            >
                                How to connect
                            </h3>
                            <p className="text-base text-[var(--mist)]">
                                Three steps from install to locked-in playback.
                            </p>
                        </div>

                        <ol className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
                            {[
                                {
                                    n: "01",
                                    title: "Install",
                                    body: "Add the TidalSync plugin in TidaLuna.",
                                    icon: (
                                        <svg className="block h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                    ),
                                },
                                {
                                    n: "02",
                                    title: "Create or join",
                                    body: "One host opens a room and shares the code.",
                                    icon: (
                                        <svg className="block h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                        </svg>
                                    ),
                                },
                                {
                                    n: "03",
                                    title: "Listen together",
                                    body: "Playback stays locked in sync for everyone.",
                                    icon: (
                                        <svg className="block h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                                        </svg>
                                    ),
                                },
                            ].map((step) => (
                                <li key={step.n} className="group relative">
                                    <div className="mb-5 flex items-center gap-3">
                                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[rgba(232,93,122,0.15)] text-[var(--accent)] ring-1 ring-[rgba(232,93,122,0.28)] transition-all group-hover:bg-[rgba(232,93,122,0.25)] group-hover:ring-[rgba(232,93,122,0.5)] leading-none [&>svg]:block">
                                            {step.icon}
                                        </span>
                                        <span
                                            className="text-sm font-semibold tracking-[0.2em] text-[var(--accent)]"
                                            style={{ fontFamily: "var(--font-display), sans-serif" }}
                                        >
                                            {step.n}
                                        </span>
                                    </div>
                                    <p className="mb-2 text-xl font-semibold text-[var(--foam)]">{step.title}</p>
                                    <p className="max-w-xs text-[15px] leading-relaxed text-[var(--mist)]">{step.body}</p>
                                </li>
                            ))}
                        </ol>
                    </footer>
                )}

                <p className="mt-14 text-center text-xs tracking-wide text-[var(--muted)]/60">
                    TidalSync — TIDAL together, in sync
                </p>
            </div>
        </div>
    );
}
