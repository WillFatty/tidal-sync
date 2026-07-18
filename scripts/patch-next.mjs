import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const cwd = process.cwd();
const nextBin = join(cwd, "node_modules/next/dist/bin/next");
const wsServer = join(cwd, "dist/server/index.js");

if (!existsSync(nextBin)) {
    console.log("[patch-next] next binary not found, skipping");
    process.exit(0);
}

if (!existsSync(wsServer)) {
    console.log("[patch-next] dist/server/index.js not found, skipping");
    process.exit(0);
}

const original = readFileSync(nextBin, "utf8");

if (original.includes("TIDALSYNC_WS_START")) {
    console.log("[patch-next] already patched");
    process.exit(0);
}

const patch = `// TIDALSYNC_WS_START
try {
    var __ws_fork = require("child_process").fork;
    var __ws_path = require("path").join(__dirname, "../../../../dist/server/index.js");
    __ws_fork(__ws_path, [], { stdio: "inherit", detached: true }).unref();
} catch (e) {}
// TIDALSYNC_WS_END
`;

const patched = original.replace(/^#!\/usr\/bin\/env node\n/, `$&\n${patch}`);
writeFileSync(nextBin, patched);
console.log("[patch-next] Patched next binary to start TidalSync WS server");
