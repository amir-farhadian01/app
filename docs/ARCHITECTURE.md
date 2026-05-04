# Neighborly — Architecture (skeleton)

## Monolith layout (server.ts, routes/, lib/, prisma/, src/, flutter_project/)
The repo is a single deployable: Express registers REST routers from `routes/`,
shared helpers in `lib/`, Prisma schema in `prisma/`, the Vite React SPA in
`src/`, and a Flutter app under `flutter_project/`. `server.ts` mounts API
prefixes and, in dev, Vite middleware on two HTTP ports (main + admin).

## Auth & RBAC
JWT access/refresh flows live under `routes/auth.ts`; protected routes use
`authenticate` / `requireRole` from `lib/auth.middleware.ts` (compiled imports
use the `.js` extension). Prisma `User.role` uses the `UserRole` enum.

## Domain models (current Prisma models, grouped)
Users & access: `User`, `WebAuthnCredential`, `Company`, `CompanyUser`.
Marketplace: `Service`, `ServiceCatalog`, `Category`, `Request`, `Contract`,
`Transaction`. Content & comms: `Post`, `Comment`, `Notification`, `ChatRoom`,
`ChatMessage`, `Ticket`. KYC: `KYC` (legacy shim), `KycLevel0Profile`,
`KycPersonalSubmission`, `BusinessKycFormSchema`, `BusinessKycSubmission`,
`KycReviewAuditLog`. Ops: `AuditLog`, `Schedule`, `B2BConnection`, and others
in `prisma/schema.prisma`.

## State machines (Order, Contract, KYC) — list current states for each one found in the code; mark TBD for ones not implemented.
- **Request** — `status` is a string on `Request` (default `pending` in schema);
  exact enum not centralized in schema (TBD: canonical list in code).
- **Contract** — `status` string (default `pending`); signing flags
  `clientSigned` / `providerSigned` (TBD: full lifecycle doc).
- **KYC** — Prisma `KycStatus` enum: `draft`, `pending`, `approved`, `rejected`,
  `resubmit_requested`; legacy `KYC` model uses freeform `status` string.

## Eventing (NATS topics currently published — extract from `lib/bus.ts` calls)
`lib/bus.ts` exposes `publish(subject, data)`. Call sites observed: `user.registered`
(`routes/auth.ts`); `request.created` (`routes/requests.ts`); `contract.created`
(`routes/contracts.ts`); `kyc.personal.submitted`, `kyc.business.submitted`,
and legacy `kyc.submitted` (`routes/kycUser.ts`, `routes/kyc.ts`).

## Storage (Postgres, Redis, NATS, /uploads)
PostgreSQL is the system of record (Prisma). Redis and NATS are optional at
runtime (`server.ts` logs warnings if unavailable). Uploaded binaries are
served from `/uploads` via static middleware.

## Frontend layers (web admin/customer, Flutter web/mobile)
React 19 + Vite 6 SPA: customer/provider experience and `AdminDashboard` share
the same bundle; admin entry uses a separate port in dev. Flutter mirrors core
flows under `flutter_project/lib/` with a shared shell widget.

## AI integrations (Gemini client-side; document where keys live)
`@google/genai` is used from the browser bundle (e.g. `src/services/geminiService.ts`,
`src/services/aiService.ts`, `src/components/BusinessIntelligence.tsx`) reading
`VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` from Vite env. Server-side Gemini usage
was not verified in this documentation pass.
