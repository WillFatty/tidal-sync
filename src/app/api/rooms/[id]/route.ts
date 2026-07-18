import { NextRequest, NextResponse } from "next/server";

const WS_SERVER = process.env.WS_SERVER || "https://tidalsyncapi.hexium.cc";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const res = await fetch(`${WS_SERVER}/api/rooms/${id}`, { cache: "no-store" });
        if (!res.ok) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Server offline" }, { status: 502 });
    }
}
