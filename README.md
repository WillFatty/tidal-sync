# TidalSync

Listen to [TIDAL](https://tidal.com) together in real time. A WebSocket sync server plus a Next.js dashboard, used with the [TidaLuna](https://github.com/Inrixia/TidaLuna) desktop plugin.

## Architecture

| Piece | Role | Default port |
| --- | --- | --- |
| **Server** (`src/server`) | WebSocket rooms, playback sync, REST/SSE status APIs, optional static files | `24124` |
| **Web** (`src/app`) | Live room dashboard (proxies API via `WS_SERVER`) | `3000` |
| **Plugin** (TidaLuna) | Host/guest clients that create rooms and stay in sync | — |

```
TidaLuna clients  ──WebSocket──►  TidalSync Server
Dashboard browser ──HTTP API──►  Next.js Web  ──proxy──►  TidalSync Server
```

## Requirements

- Node.js 20+ (22 recommended)
- npm

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

## Plugin setup (TidaLuna)

1. Install [TidaLuna](https://github.com/Inrixia/TidaLuna) for TIDAL Desktop.
2. In TidaLuna: **Settings → Plugin Store**, add:
   ```
   https://github.com/WillFatty/luna-plugins/releases/download/latest/store.json
   ```
3. Search for **TidalSync** and install it.
4. Enable the plugin under **Plugins**.
5. In TidalSync settings, set the server URL (hosted example: `https://tidalsyncapi.hexium.cc/`) or point it at your own server.
6. Optionally set a **Display Name**.
7. Click the **link icon** in the playbar to create or join a room.

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
