# PORTS.md — Neighborly Port Registry
# Single source of truth for ALL ports in the project.
# Last updated: 2026-05-15

---

## 🖥️ Local Dev (npm run / flutter run)

| Service | Port | URL | Notes |
|---|---|---|---|
| **Backend API** | **8080** | http://localhost:8080 | `server.ts` → `PORT` env (default 8080) |
| **Admin API** | **9090** | http://localhost:9090 | `server.ts` → `ADMIN_PORT` env (default 9090) |
| **Vite React Frontend** | **5173** | http://localhost:5173 | `cd frontend && npm run dev -- --port 5173` |
| **Flutter Web (dev)** | **7357** | http://localhost:7357 | `flutter run -d web-server --web-port 7357` |
| **Flutter Web (alt)** | 5174 | http://localhost:5174 | legacy port — use 7357 instead |

> ⚠️ AGENTS.md used to say backend=3000 — that was wrong. Backend is **8080** internally, exposed as **3000** only via Docker (see below).

---

## 🐳 Docker Compose (docker-compose up)

| Container | Internal Port | Host Port | URL | Notes |
|---|---|---|---|---|
| **web-app** (Express API) | 8080 | **3000** | http://localhost:3000 | `3000:8080` mapping |
| **web-app** (Admin API) | 9090 | **9090** | http://localhost:9090 | `${ADMIN_PORT:-9090}:9090` |
| **frontend** (Vite React) | 5173 | **5173** | http://localhost:5173 | |
| **flutter-web** (nginx) | 80 | — | via Traefik `/flutter` | no direct host port |
| **postgres** | 5432 | **5432** | localhost:5432 | `${POSTGRES_HOST_PORT:-5432}` |
| **postgres-media** | 5432 | **5433** | localhost:5433 | separate media DB |
| **redis** | 6379 | — | internal only | no host mapping |
| **nats** | 4222 | — | internal only | no host mapping |
| **traefik dashboard** | 8080 | **8080** | http://localhost:8080 | conflicts w/ API in dev! use Docker mode |
| **portainer** | 9000 | **9000** | http://localhost:9000 | container management UI |
| **minio API** | 9000 | **9002** | http://localhost:9002 | S3-compatible object storage |
| **minio console** | 9001 | **9003** | http://localhost:9003 | MinIO web UI |
| **dozzle** (logs) | 8080 | **8888** | http://localhost:8888 | container log viewer |
| **metabase** | 3000 | **3001** | http://localhost:3001 | analytics |

---

## 🔀 Traefik Routing (Docker mode, all via port 80)

| Path prefix | Routes to | Notes |
|---|---|---|
| `/app`, `/auth`, `/business`, `/admin`, `/explore` | frontend:5173 | React Vite app |
| `/flutter` | flutter-web:80 | Flutter Web (nginx build) |
| `/dozzle` | dozzle:8080 | Log viewer |
| `/metabase` | metabase:3000 | Analytics |
| `/portainer` | portainer:9000 | Container manager |
| `/minio` | minio:9001 | Object storage console |
| `/` (catch-all) | web-app:8080 | Express API |

---

## ⚙️ .env Variables That Control Ports

```bash
PORT=8080               # Backend API internal port
ADMIN_PORT=9090         # Admin API port (must differ from PORT)
POSTGRES_HOST_PORT=5432 # Postgres host binding
```

---

## 🚀 Quick Start (Local Dev — no Docker)

```bash
# Terminal 1 — Backend
npm install && npx tsx server.ts
# → http://localhost:8080
# → http://localhost:9090 (admin)

# Terminal 2 — React Frontend
cd frontend && npm install && npm run dev -- --port 5173
# → http://localhost:5173

# Terminal 3 — Flutter Web
cd flutter_project && flutter pub get && flutter run -d web-server --web-port 7357
# → http://localhost:7357

# Terminal 4 — Flutter Mobile
cd flutter_project && flutter run -d <device-id>
```
