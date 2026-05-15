# AGENTS.md — Neighborly Marketplace · Project Intelligence File
# Last updated: 2026-05-15
# Source of truth for ALL AI agents working on this repo.
# READ THIS ENTIRE FILE BEFORE TOUCHING ANYTHING.

---

## 🧭 WHO IS IN CHARGE

**Project Architect & PM:** Amir Farhadian (owner)
**AI Strategy Director:** Perplexity (Space: "app") — receives all high-level decisions,
  breaks them into implementation prompts, and hands them to coding agents.
**Coding Agents:** Roo Code + DeepSeek V4 — execute prompts exactly as written.

---

## 📌 PROJECT OVERVIEW

**Name:** Neighborly
**Type:** Local services marketplace (Uber for home services)
**Repo:** github.com/amir-farhadian01/app

### Stack
| Layer | Technology |
|---|---|
| Backend API | Node.js + TypeScript, Fastify, `server.ts` at root |
| ORM | Prisma **5.x** (DO NOT upgrade) |
| Database | PostgreSQL |
| Web Frontend | `frontend/` — Vite + React |
| Mobile + Web App | `flutter_project/` — Flutter 3.x |
| Auth | JWT (`JWT_SECRET` in `.env`) |
| Realtime | Firebase (config in `firebase-applet-config.json`) |
| Infra | Docker + docker-compose |

### Ports (NEVER change these)
| Service | Port |
|---|---|
| Backend API | 3000 |
| Web Frontend (Vite) | 5173 |
| Flutter Web | 5174 |
| Flutter Android | emulator/device |
| Flutter iOS | simulator/device |

---

## ✅ COMPLETED FEATURES

- **F5** — (done)
- **F6** — (done)
- **F7** — (done)
- **F8-admin** — (done)

---

## 🚧 CURRENT PHASE

**Phase: Dev Environment Setup**
- Backend + Web Frontend + Flutter Web running locally ✅
- Flutter Android / iOS wired up
- Next: New UI design on Flutter → connect to backend

---

## 🚫 ABSOLUTE RULES (NON-NEGOTIABLE)

1. **NEVER touch `lib/matching/`** — matching algorithm is sacred, hands off
2. **NEVER touch chat-related files** — chat logic is complete, do not modify
3. **NEVER touch `src/` directory**
4. **Prisma stays at 5.x** — no upgrades, no downgrades
5. **All TS/JS imports must use `.js` extension** — e.g. `import './foo.js'`
6. **NO Stripe or any payment library** — payments are out of scope
7. **Use `npm` only** — no yarn, no pnpm
8. **READ before WRITE** — read every file fully before editing it
9. **No new business logic** unless explicitly instructed by the architect
10. **Each service runs in its OWN process** — never combine backend + frontend in one command

---

## 📁 DIRECTORY MAP

```
/
├── server.ts              ← Fastify backend entry point (port 3000)
├── routes/                ← API route handlers
├── lib/                   ← Shared utilities
│   └── matching/          ← 🚫 DO NOT TOUCH
├── prisma/                ← Prisma schema + migrations
├── frontend/              ← Vite + React web app (port 5173)
├── flutter_project/       ← Flutter app (, mobile:device)
├── docs/                  ← All documentation & roadmaps
├── files/                 ← Static assets
├── plans/                 ← Legacy planning docs (read-only reference)
├── infra/                 ← Infrastructure configs
├── scripts/               ← Utility scripts
├── docker-compose.yml     ← Full stack docker config
├── .env.example           ← Copy to .env and fill in secrets
├── AGENTS.md              ← THIS FILE
└── CLAUDE.md              ← Claude-specific instructions
```

---

## 🔑 ENV SETUP (local dev)

Copy `.env.example` → `.env` and set:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/neighborly"
JWT_SECRET="dev-secret-local"
NODE_ENV="development"
```

---

## 🔄 HOW TO START EVERYTHING LOCALLY

```bash
# Terminal 1 — Backend
npm install && npx tsx server.ts

# Terminal 2 — Web Frontend
cd frontend && npm install && npm run dev -- --port 5173

# Terminal 3 — Flutter Web
cd flutter_project && flutter pub get && flutter run -d web-server --web-port 5174

# Terminal 4 — Flutter Mobile (if device available)
cd flutter_project && flutter run -d <device-id>
```

Verify:
- http://localhost:3000/health → JSON response
- http://localhost:5173 → 200 OK
- http://localhost:5174 → 200 OK

---

## 📋 PROMPT WORKFLOW

All implementation prompts follow this structure:
1. `SYSTEM/ROLE` — agent identity
2. `PROJECT CONTEXT` — what we're building
3. `EXECUTION RULES` — the 10 absolute rules above
4. `TASK` — numbered steps, execute in order
5. `FINAL VERIFICATION` — tests to confirm success

Agents must complete ALL steps and run ALL verification checks before reporting done.
