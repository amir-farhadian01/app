# Neighborly 2.0

Social marketplace platform — part Instagram, part TaskRabbit, part Groupon.
Local services booking with social feed, KYC verification, and Stripe Connect payouts.

## Stack
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL (port 8077)
- **Frontend (new)**: React 18 + Vite + TailwindCSS + Zustand (port 5173, in `frontend/`)
- **Frontend (old)**: React 18 + Vite (served by backend on port 8077, in `src/`)
- **Mobile**: Flutter (iOS + Android + Web, in `flutter_project/`)
- **Infrastructure**: Docker + Redis + NATS

## Getting Started
1. `cp .env.example .env` (fill in required values)
2. `docker compose up -d` (starts postgres, redis, NATS)
3. `npx prisma migrate dev`
4. `npm run dev` (starts backend on port 8077)
5. `cd frontend && npm run dev` (starts new frontend on port 5173)

## Documentation
Read `docs/ROADMAP.md` first for the full phased execution plan.

## Project Structure
```
├── src/              # Old React frontend (served by backend on port 8077)
├── frontend/         # New React frontend (port 5173)
├── flutter_project/  # Flutter mobile app
├── routes/           # Backend API routes
├── prisma/           # Prisma schema and migrations
├── docs/             # Documentation
├── plans/            # Execution plans
└── docker/           # Docker configuration
```
