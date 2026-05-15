# START HERE — Neighborly 2.0 Agent Onboarding

> This is the FIRST file you read. Then read docs/ROADMAP.md, docs/FEATURES.md, docs/AGENTS.md in that order.
> Do not write a single line of code before reading all four files.

---

## WHO YOU ARE

You are a senior full-stack engineer and DevOps lead working on **Neighborly 2.0** — a social marketplace platform
built on an existing Node.js/Express/TypeScript backend with Prisma ORM, PostgreSQL, Redis, Flutter mobile app,
and a new React frontend that needs to be built.

You work autonomously. You do not ask for permission before performing cleanup tasks listed in this file.
You do not rewrite working backend code. You build on top of what exists.

---

## REPOSITORY STRUCTURE (as of onboarding)

```
/
├── .cursor/rules/          keep — Cursor IDE rules
├── .github/                keep — update with new CI workflows
├── .playwright-mcp/        keep
├── .vscode/                keep
├── docker/                 keep — Docker service configs
├── docs/                   keep — update with new docs (see below)
├── flutter_project/        keep — Flutter mobile app
├── infra/traefik/          keep — reverse proxy config
├── lib/                    keep — shared backend libraries
├── prisma/                 keep — database schema, DO NOT delete models
├── repoversion2/           DELETE ENTIRELY
├── routes/                 keep — Express route handlers
├── scratch/                DELETE ENTIRELY
├── scripts/                keep — review contents first
├── src/                    keep — backend TypeScript source
├── temp_version2/          DELETE ENTIRELY
├── .backend.pid            DELETE
├── .flutter.pid            DELETE
├── admin_audit.png         DELETE
├── admin_users.png         DELETE
├── admin_users_direct.png  DELETE
├── admin_users_success.png DELETE
├── flutter_audit.png       DELETE
├── flutter_audit_v2.png    DELETE
├── flutter_auth.png        DELETE
├── login_debug.png         DELETE
├── login_mobile.png        DELETE
├── react_audit.png         DELETE
├── react_auth_desktop.png  DELETE
├── index.html              REVIEW — if it is a stale static mock, delete it.
│                           If it is a Vite app entry point, keep it.
│                           Run: head -5 index.html to check.
├── provider-ui-mock.html   DELETE — design mock, no longer needed
├── sync-from-version2.sh   DELETE
├── run-project.sh          UPDATE — rewrite to reflect new structure
├── server.ts               keep — backend entry point
├── package.json            keep — review and update scripts
├── docker-compose.yml      keep — add frontend service when ready
├── Dockerfile              keep
├── tsconfig.json           keep
├── vite.config.ts          keep or move to frontend/ when scaffolding
├── CLAUDE.md               UPDATE — point to this file and docs/
├── AGENTS.md               keep — top-level symlink or copy of docs/AGENTS.md
├── README.md               UPDATE — rewrite with Neighborly 2.0 description
└── firebase-*.json         REVIEW — Firebase config files, keep if FCM push
    firestore.rules                  notifications are still in use, otherwise archive
```

---

## YOUR TASKS IN ORDER

Complete these phases in sequence. Do not skip ahead. Commit after each phase.

---

### PHASE 0 — CLEANUP (do this first, before anything else)

**Step 0.1 — Delete junk files and folders**

Run these commands from the repository root:

```bash
# Remove backup/version folders
rm -rf repoversion2/
rm -rf temp_version2/
rm -rf scratch/

# Remove root-level screenshot PNGs
rm -f admin_audit.png admin_users.png admin_users_direct.png admin_users_success.png
rm -f flutter_audit.png flutter_audit_v2.png flutter_auth.png
rm -f login_debug.png login_mobile.png react_audit.png react_auth_desktop.png

# Remove process ID files
rm -f .backend.pid .flutter.pid

# Remove legacy sync scripts and mock files
rm -f sync-from-version2.sh provider-ui-mock.html

# Check index.html before deleting
head -5 index.html
# If it contains <!DOCTYPE html> and references a static mock UI, delete it
# If it contains <script type="module" src="/src/main.tsx"> or similar, keep it
```

**Step 0.2 — Update .gitignore**

Add these lines to .gitignore if not already present:

```
# Process ID files
*.pid
.backend.pid
.flutter.pid

# Screenshot files committed by mistake
*.png
!docs/**/*.png
!public/**/*.png

# Coverage reports
coverage/
frontend/coverage/

# Build artifacts
dist/
frontend/dist/
```

**Step 0.3 — Update docs/ folder**

Replace old documentation with the new set. The new files are provided alongside this file:

- Copy ROADMAP.md → docs/ROADMAP.md  (replace existing)
- Copy FEATURES.md → docs/FEATURES.md  (replace existing)
- Copy AGENTS.md → docs/AGENTS.md  (replace existing)
- Keep existing: docs/DECISIONS.md, docs/ARCHITECTURE.md, docs/GLOSSARY.md (do not delete)
- Keep existing: docs/README.md (update its links to point to new files)

**Step 0.4 — Update CLAUDE.md**

Replace the contents of CLAUDE.md with:

```markdown
# Neighborly 2.0 — Claude/Cursor Agent Guide

Read these files in this exact order before doing anything:
1. START_HERE.md  (you are reading this)
2. docs/ROADMAP.md
3. docs/FEATURES.md
4. docs/AGENTS.md

Quick commands:
- Start backend: npm run dev
- Start frontend: cd frontend && npm run dev
- Run all tests: npm test && cd frontend && npm test
- Docker up: docker compose up -d
- Prisma migrate: npx prisma migrate dev
```

**Step 0.5 — Update README.md**

Rewrite README.md to reflect Neighborly 2.0. Keep it brief:

```markdown
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
```

**Step 0.6 — Commit cleanup**

```bash
git add -A
git commit -m "chore(cleanup): remove backup folders, stale PNGs, and legacy scripts"
```

---

### PHASE 1 — FRONTEND SCAFFOLD

After cleanup is committed, scaffold the React frontend.

**Step 1.1 — Create the frontend directory**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install @tanstack/react-query zustand react-router-dom axios
npm install lucide-react recharts react-hook-form zod @hookform/resolvers
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 1.2 — Directory structure to create**

```
frontend/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
├── pages/
│   ├── public/Feed.tsx
│   ├── public/Explore.tsx
│   ├── public/ServiceDetail.tsx
│   ├── auth/Login.tsx
│   ├── auth/Register.tsx
│   ├── customer/CustomerHome.tsx
│   ├── customer/MyOrders.tsx
│   ├── customer/OrderDetail.tsx
│   ├── customer/Messages.tsx
│   ├── business/BusinessDashboard.tsx
│   ├── business/Inbox.tsx
│   ├── business/Schedule.tsx
│   ├── business/Clients.tsx
│   ├── business/Finance.tsx
│   ├── business/Social.tsx
│   └── admin/AdminDashboard.tsx
├── components/
│   ├── layout/
│   │   ├── PublicLayout.tsx
│   │   ├── CustomerLayout.tsx
│   │   ├── BusinessLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── ui/              (shadcn components go here)
│   ├── social/
│   │   ├── FeedCard.tsx
│   │   ├── StoriesRow.tsx
│   │   └── VideoPlayer.tsx
│   ├── orders/
│   │   ├── OrderWizard.tsx
│   │   └── OrderCard.tsx
│   └── chat/
│       ├── ChatThread.tsx
│       └── ContractFlow.tsx
├── services/
│   ├── api.ts           (axios instance + interceptors)
│   ├── auth.ts
│   ├── orders.ts
│   ├── chat.ts
│   └── kyc.ts
├── store/
│   ├── authStore.ts
│   └── uiStore.ts
└── hooks/
    ├── useAuth.ts
    └── useLocationFilter.ts
```

**Step 1.3 — API base configuration**

In frontend/src/services/api.ts:
- Base URL: import.meta.env.VITE_API_URL or http://localhost:3000/api
- Attach Authorization Bearer token from authStore on every request
- On 401 response: attempt token refresh, on failure redirect to /auth/login

**Step 1.4 — Routing map**

Implement these routes in frontend/src/app/router.tsx:

Public (no auth required):
- /                  → Feed (public social feed)
- /explore           → Explore
- /services/:id      → ServiceDetail
- /auth/login        → Login
- /auth/register     → Register

Customer (auth required, role: CUSTOMER):
- /app/home          → CustomerHome
- /app/orders        → MyOrders
- /app/orders/:id    → OrderDetail
- /app/orders/new    → OrderWizard
- /app/messages      → Messages (chat hub)
- /app/profile       → Profile + KYC status

Business (auth required, role: BUSINESS_OWNER or EMPLOYEE):
- /business/:id              → BusinessDashboard
- /business/:id/inbox        → Inbox
- /business/:id/finance      → Finance
- /business/:id/social       → Social

Admin (auth required, role: ADMIN):
- /admin             → AdminDashboard
- /admin/users       → Users CRM
- /admin/kyc         → KYC queue
- /admin/orders      → Orders management
- /admin/media       → Media audit

**Step 1.5 — Update docker-compose.yml**

Add a frontend service:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  ports:
    - "5173:5173"
  environment:
    - VITE_API_URL=http://localhost:3000/api
  volumes:
    - ./frontend:/app
    - /app/node_modules
  depends_on:
    - api
```

**Step 1.6 — Commit**

```bash
git add -A
git commit -m "feat(frontend): scaffold React 18 + Vite + Tailwind frontend structure"
```

---

### PHASE 2 — CI/CD PIPELINE

After frontend scaffold is committed:

**Step 2.1 — Create .github/workflows/ci.yml**

Refer to docs/AGENTS.md for the full GitHub Actions workflow.
The workflow must include: lint, typecheck, test (backend), test (frontend), sonar, docker-build, deploy (main only).

**Step 2.2 — Create sonar-project.properties at root**

Refer to docs/AGENTS.md for the full SonarCloud config.

**Step 2.3 — Add test scripts to package.json**

Backend package.json scripts must include:
- "lint": "eslint src/ routes/ --ext .ts"
- "typecheck": "tsc --noEmit"
- "test": "jest --coverage"
- "test:watch": "jest --watch"

Frontend package.json scripts must include:
- "lint": "eslint src/ --ext .ts,.tsx"
- "typecheck": "tsc --noEmit"
- "test": "vitest run --coverage"
- "test:watch": "vitest"

**Step 2.4 — Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions pipeline and SonarCloud configuration"
```

---

### PHASE 3 — PRISMA SCHEMA EXTENSIONS

After CI is set up:

Read the existing prisma/schema.prisma carefully.
Do NOT delete any existing models or fields.
Add the new models listed in docs/FEATURES.md under "DATABASE MODEL ADDITIONS".

Models to add:
- UserAddress (with addressTag and categoryTags fields)
- BusinessVerification (license + insurance verification)
- BusinessTrustScore (KYC + license + insurance + avgRating = totalScore)
- UtilityLink + UtilityLinkClick (admin-curated public links)
- Invoice + InvoiceStatus enum
- WorkspaceSocialRole (social media manager role assignment)
- Add normalizedEmail field to User model with @unique constraint

After editing schema:
```bash
npx prisma migrate dev --name "add_neighborly_v2_models"
npx prisma generate
```

Commit:
```bash
git add -A
git commit -m "feat(prisma): add v2 models - addresses, trust scores, invoices, utility links"
```

---

### PHASE 4 — NEW BACKEND ENDPOINTS

After schema migration, add missing API routes.

Read docs/AGENTS.md section "New API Endpoints Needed" for the full list.

Priority order:
1. GET /api/feed and GET /api/feed/public (social feed)
2. POST /api/posts, GET /api/posts/:id (post creation)
3. GET /api/utility-links (public endpoint)
4. POST /api/workspaces/:id/invoices (invoice creation)
5. GET /api/workspaces/:id/clients (business CRM)
6. GET /api/admin/media (media audit)
7. GET /api/admin/utility-links (admin CRUD)

For each endpoint:
- Route handler in routes/
- Business logic in src/lib/ or src/services/
- Input validation with Zod
- Auth middleware applied correctly
- Unit test written covering: unauthenticated request, invalid input, happy path

---

### PHASE 5 AND BEYOND

Refer to docs/ROADMAP.md for all remaining phases.
Work through Phase 1 (Auth/KYC) → Phase 2 (Social Feed) → Phase 3 (Booking) etc.
Update ROADMAP.md status column as you complete work.

---

## RULES YOU MUST FOLLOW

1. All code in English — no Farsi/Persian in code, comments, commits, or logs
2. TypeScript strict mode — no any types, all async functions typed
3. Never delete database columns — use archivedAt for soft-delete
4. No business logic in React components — use hooks and services
5. Every new function needs a unit test
6. Run npm run typecheck and npm run lint before every commit — fix all errors
7. SonarCloud must pass — 0 blockers, 0 criticals
8. ROADMAP.md is updated when you complete a phase or discover something wrong
9. Commit after each logical unit of work — small commits with clear messages
10. If something in this file conflicts with docs/AGENTS.md — docs/AGENTS.md wins

---

## QUICK REFERENCE

| Command | What it does |
|---------|-------------|
| npm run dev | Start backend (port 3000) |
| cd frontend && npm run dev | Start frontend (port 5173) |
| docker compose up -d | Start postgres, redis, NATS, traefik |
| npx prisma migrate dev | Apply pending schema migrations |
| npx prisma studio | Open DB browser at port 5555 |
| npm test | Run backend tests with coverage |
| cd frontend && npm test | Run frontend tests with coverage |
| npm run lint | ESLint check |
| npm run typecheck | TypeScript strict check |

---

## CONTACT / ESCALATION

If you encounter an ambiguity not covered by the docs:
1. Check docs/DECISIONS.md for prior architectural decisions
2. If not there, make the most sensible choice and add an entry to docs/DECISIONS.md explaining what you decided and why
3. Do not stop work to ask — decide, document, continue
