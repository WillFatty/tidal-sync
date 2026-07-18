import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Pterodactyl containers often hit spawn EAGAIN when Next forks
    // one worker per host CPU. Cap workers hard.
    experimental: {
        cpus: 1,
        workerThreads: false,
    },
};

export default nextConfig;
