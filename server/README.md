# Bumbis matchmaking API

Tiny self-hosted backend powering the live matchmaking lobby (`/match/:roomId`).
Express + SQLite (`better-sqlite3`). State lives in a single SQLite file; live
check-ins are pushed to every device over Server-Sent Events.

No third-party services, no auth — designed for a casual office game on a LAN /
small VPS.

## Endpoints

| Method | Path                              | Purpose                                  |
| ------ | --------------------------------- | ---------------------------------------- |
| POST   | `/api/rooms`                      | Create a lobby → `{ id }`                |
| GET    | `/api/rooms/:id`                  | Current room state                       |
| GET    | `/api/rooms/:id/events`           | SSE stream of room state (live updates)  |
| POST   | `/api/rooms/:id/players`          | Check in `{ name }` (idempotent by name) |
| DELETE | `/api/rooms/:id/players/:pid`     | Leave                                    |
| POST   | `/api/rooms/:id/split`            | Split players into `{ teamCount }` teams |
| POST   | `/api/rooms/:id/reset`            | Back to lobby (keeps players)            |
| GET    | `/api/health`                     | Liveness check                           |

Rooms untouched for 24h are pruned automatically.

## Local dev

```bash
cd server
yarn install      # or npm install
yarn dev          # node --watch, listens on :8787
```

In another terminal run the frontend (`yarn dev` at repo root). Vite proxies
`/api` → `http://localhost:8787`, so the app and API share an origin.

## Production (VPS)

1. Install deps and start the service:

   ```bash
   cd /var/www/bumbis/server && yarn install --frozen-lockfile
   sudo cp bumbis-api.service /etc/systemd/system/
   # edit ExecStart in the unit to your absolute node path (command -v node)
   sudo systemctl daemon-reload
   sudo systemctl enable --now bumbis-api
   ```

2. Add the API reverse-proxy to nginx (see `nginx-api.conf.example`), then
   `sudo nginx -t && sudo systemctl reload nginx`.

`scripts/deploy.sh` reinstalls server deps and restarts `bumbis-api` on every
deploy once the unit exists.

## Config

| Env var      | Default                  | Notes                         |
| ------------ | ------------------------ | ----------------------------- |
| `PORT`       | `8787`                   | API listen port               |
| `BUMBIS_DB`  | `server/data/bumbis.db`  | SQLite file path              |

> `better-sqlite3` ships prebuilt binaries for common Linux/macOS/Windows +
> Node LTS combos. If install tries to compile, ensure `python3`, `make`, and a
> C++ toolchain are present, or pin to a Node version with a published prebuild.
