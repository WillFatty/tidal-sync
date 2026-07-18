import { fork } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextBin = join(__dirname, "node_modules/.bin/next");

const server = fork(join(__dirname, "dist/server/index.js"), [], {
    stdio: "inherit",
    env: process.env,
});

const web = fork(nextBin, ["start", "-p", process.env.WEB_PORT || "3000"], {
    stdio: "inherit",
    env: process.env,
});

const shutdown = () => {
    server.kill();
    web.kill();
    process.exit();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("exit", shutdown);
web.on("exit", shutdown);
