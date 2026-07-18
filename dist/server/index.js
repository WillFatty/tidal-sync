import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { attachWebSocket } from "./ws.js";
import { getActiveRooms, getRoomCount, getRoomDetail, getRoomLogs, addRoomListener } from "./room.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, "../../public");
const PORT = parseInt(process.env.PORT || "24124", 10);
const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json",
    ".txt": "text/plain; charset=utf-8",
};
function serveStatic(res, filePath) {
    try {
        if (!existsSync(filePath) || !statSync(filePath).isFile())
            return false;
        const ext = extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        readFileSync(filePath).forEach(b => res.write(b));
        res.end();
        return true;
    }
    catch {
        return false;
    }
}
const handler = (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    if (url.pathname === "/api/status") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
            status: "ok",
            rooms: getRoomCount(),
            activeRooms: getActiveRooms(),
            uptime: process.uptime(),
        }));
        return;
    }
    const roomMatch = url.pathname.match(/^\/api\/rooms\/([A-F0-9]+)$/);
    if (roomMatch && req.method === "GET") {
        const detail = getRoomDetail(roomMatch[1]);
        if (!detail) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Room not found" }));
            return;
        }
        const logs = getRoomLogs(roomMatch[1]);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ...detail, messages: logs }));
        return;
    }
    const roomSSEMatch = url.pathname.match(/^\/api\/rooms\/([A-F0-9]+)\/events$/);
    if (roomSSEMatch && req.method === "GET") {
        const roomId = roomSSEMatch[1];
        const detail = getRoomDetail(roomId);
        if (!detail) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Room not found" }));
            return;
        }
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });
        res.write(":\n\n");
        const unsubscribe = addRoomListener(roomId, (msg) => {
            res.write(`data: ${JSON.stringify(msg)}\n\n`);
        });
        req.on("close", () => unsubscribe());
        return;
    }
    let filePath = join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
    if (serveStatic(res, filePath))
        return;
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = join(filePath, "index.html");
        if (serveStatic(res, filePath))
            return;
    }
    filePath = join(PUBLIC_DIR, "index.html");
    if (serveStatic(res, filePath))
        return;
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
};
const httpServer = createServer(handler);
attachWebSocket(httpServer);
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[TidalSync] Server → http://0.0.0.0:${PORT}`);
    console.log(`[TidalSync] Serving static files from ${PUBLIC_DIR}`);
});
