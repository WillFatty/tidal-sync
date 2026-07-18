# TidalSync

Listen to [TIDAL](https://tidal.com) together in real time. This repo is the **sync server** and **web dashboard**. The TidaLuna client plugin lives in a separate repository.

## Related repositories

| Repo | What it is |
| --- | --- |
| **[WillFatty/tidal-sync](https://github.com/WillFatty/tidal-sync)** (this repo) | WebSocket sync server + Next.js dashboard |
| **[WillFatty/luna-plugins](https://github.com/WillFatty/luna-plugins)** | TidaLuna plugins, including **TidalSync** — install via the plugin store release |
| **[Inrixia/TidaLuna](https://github.com/Inrixia/TidaLuna)** | TIDAL Desktop plugin host required to run the client |

You need all three pieces for a full setup: TidaLuna → TidalSync plugin (`luna-plugins`) → this server (and optionally the dashboard).

## Architecture

| Piece | Repo | Role | Default port |
| --- | --- | --- | --- |
| **Server** (`src/server`) | tidal-sync | WebSocket rooms, playback sync, REST/SSE status APIs | `24124` |
| **Web** (`src/app`) | tidal-sync | Live room dashboard (proxies API via `WS_SERVER`) | `3000` |
| **Plugin** | [luna-plugins](https://github.com/WillFatty/luna-plugins) | Host/guest client inside TidaLuna | — |

```
TidaLuna + TidalSync plugin  ──WebSocket──►  TidalSync Server (this repo)
Dashboard browser            ──HTTP API──►  Next.js Web      ──proxy──►  Server
```

## Requirements

- Node.js 20+ (22 recommended)
- npm
- [TidaLuna](https://github.com/Inrixia/TidaLuna) + the TidalSync plugin from [luna-plugins](https://github.com/WillFatty/luna-plugins) (for actual listening)

## Local development

```bash
git clone https://github.com/WillFatty/tidal-sync.git
cd tidal-sync
npm install

# Both processes (WS server + Next dashboard)
npm run dev

# Or separately
npm run dev:server   # http://0.0.0.0:24124
npm run dev:web      # http://localhost:3000
```

### Production build

```bash
npm run build          # server + web
npm run start:server   # node dist/server/index.js
npm run start:web      # next start
```

## Environment variables

### Server

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `24124` | Listen port (also accepts `SERVER_PORT` for Pterodactyl) |

### Web

| Variable | Default | Description |
| --- | --- | --- |
| `WS_SERVER` | `https://tidalsyncapi.hexium.cc` | Base URL of the TidalSync API/WebSocket server (no path) |
| `PORT` | Next default | Port for `next start` |

## Plugin setup (separate repo)

The client is **not** in this repository. It ships from **[WillFatty/luna-plugins](https://github.com/WillFatty/luna-plugins)** as a TidaLuna store package.

1. Install [TidaLuna](https://github.com/Inrixia/TidaLuna) for TIDAL Desktop.
2. In TidaLuna: **Settings → Plugin Store**, add the store URL from luna-plugins releases:
   ```
   https://github.com/WillFatty/luna-plugins/releases/download/latest/store.json
   ```
3. Search for **TidalSync** and install it.
4. Enable the plugin under **Plugins**.
5. In TidalSync settings, set the server URL (hosted example: `https://tidalsyncapi.hexium.cc/`) or point it at an instance of **this** server.
6. Optionally set a **Display Name**.
7. Click the **link icon** in the playbar to create or join a room.

For plugin source, issues, and releases, use [luna-plugins](https://github.com/WillFatty/luna-plugins). For server/dashboard issues, use this repo.

The dashboard’s **Install Plugin** button walks through the same steps.

## Pterodactyl

Eggs live in [`eggs/`](./eggs):

| Egg | File | Notes |
| --- | --- | --- |
| TidalSync Server | [`eggs/tidalsync-server.json`](./eggs/tidalsync-server.json) | One allocation port → binds via `PORT` / `SERVER_PORT` |
| TidalSync Web | [`eggs/tidalsync-web.json`](./eggs/tidalsync-web.json) | One allocation port; set `WS_SERVER` to your server URL |

### Import

1. Panel → **Nests** → import each egg JSON.
2. Create a **Server** from the egg.
3. Assign **one** allocation (that becomes `SERVER_PORT`).
4. Run **Reinstall** so the install script clones + builds.

### Web egg tips

- Prefer **≥ 1 GB RAM**. Next builds can fail with `spawn EAGAIN` on tiny containers.
- Leave **Auto Update = 0** after the first good start. Rebuilds only when `.next` is missing or Auto Update is on.
- If start fails with missing `.next/prerender-manifest.json`, wipe `.next` and reinstall (or start once with Auto Update `1`).

### Server egg tips

- Point clients and the web egg’s `WS_SERVER` at this server’s public URL (HTTPS reverse proxy recommended).
- Health check: `GET /api/status`.

## API (server)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/status` | Online status, room count, active rooms, uptime |
| `GET` | `/api/rooms/:id` | Room detail + recent messages |
| `GET` | `/api/rooms/:id/events` | SSE stream of room messages |
| `WS` | `/` | Plugin sync protocol |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | WS server + Next (concurrent) |
| `npm run dev:server` | WS server only (`tsx` watch) |
| `npm run dev:web` | Next.js only |
| `npm run build` | `build:server` + `build:web` |
| `npm run build:server` | Compile `src/server` → `dist/server` |
| `npm run build:web` | `next build` |
| `npm run start:server` | Run compiled WS server |
| `npm run start:web` | Run Next production server |

## License

Private / as declared by the repository owner.
