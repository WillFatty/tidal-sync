import { NextRequest } from "next/server";

const WS_SERVER = process.env.WS_SERVER || "http://localhost:24124";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const upstream = new AbortController();
    const res = await fetch(`${WS_SERVER}/api/rooms/${id}/events`, {
        signal: upstream.signal,
        cache: "no-store",
    });

    if (!res.ok || !res.body) {
        return new Response("Not found", { status: 404 });
    }

    const stream = new ReadableStream({
        start(controller) {
            const reader = res.body!.getReader();
            const pump = async (): Promise<void> => {
                const { done, value } = await reader.read();
                if (done) {
                    controller.close();
                    return;
                }
                controller.enqueue(value);
                return pump();
            };
            pump().catch(() => controller.close());
        },
        cancel() {
            upstream.abort();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
