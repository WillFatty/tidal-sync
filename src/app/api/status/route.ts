import { NextResponse } from "next/server";

const WS_SERVER = process.env.WS_SERVER || "https://testapi.wtfm.space";

export async function GET() {
    try {
        const res = await fetch(`${WS_SERVER}/api/status`, { cache: "no-store" });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ status: "offline", rooms: 0, activeRooms: [], uptime: 0 });
    }
}
