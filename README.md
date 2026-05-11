# Neighborly 2.0

Social marketplace platform — part Instagram, part TaskRabbit, part Groupon.
Local services booking with social feed, KYC verification, and Stripe Connect payouts.

## Stack
- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Frontend: React 18 + Vite + TailwindCSS + shadcn/ui
- Mobile: Flutter (iOS + Android)
- Infrastructure: Docker + Traefik + Redis + NATS

## Getting Started
1. cp .env.example .env  (fill in required values)
2. docker compose up -d  (starts postgres, redis, NATS)
3. npx prisma migrate dev
4. npm run dev            (starts backend on port 3000)
5. cd frontend && npm run dev  (starts frontend on port 5173)

## Documentation
Read docs/ROADMAP.md first.
