# Neighborly 2.0 — Complete Project Implementation Plan

## Project Overview

**Neighborly 2.0** is a social marketplace platform — part Instagram, part TaskRabbit, part Groupon. It has a Node.js/Express/TypeScript backend (already built), a new React frontend (partially scaffolded), and a Flutter mobile app.

## Current State Analysis

### ✅ Already Built (Backend)
- Full Prisma schema with ~40+ models (Users, Orders, Contracts, KYC, Chat, Matching Engine, etc.)
- All backend routes in `routes/` (auth, orders, contracts, KYC, chat, payments, admin, etc.)
- Business logic in `lib/` (matching engine, contract drafting, chat moderation, KYC, etc.)
- JWT auth with refresh token rotation
- NATS event bus, Redis caching
- Docker Compose setup (PostgreSQL, Redis, NATS, Traefik)

### ✅ Already Built (Old Frontend in `src/`)
- Admin Dashboard with: Users CRM, KYC review, Service Definitions, Orders, Contracts, Payments, Chat Moderation, Inventory, Packages
- Customer Dashboard with: Home, Orders, Profile, KYC flow, Order Wizard
- Provider Dashboard with: Inbox, Schedule, Finance, Inventory, Packages, Staff
- Business KYC flow
- Order Wizard (7-step)
- Chat system
- All admin components (service definitions tree, form builder, etc.)

### 🚧 Partially Built (New Frontend in `frontend/`)
- Vite + React + TailwindCSS scaffolded
- Router defined with all routes
- Layout components (Public, Customer, Business, Admin)
- Basic pages exist but are mostly stubs
- API client (`lib/api.ts`) with Axios + auth interceptor
- Auth store (Zustand)
- Some page implementations exist (Login, Register, Feed, Explore, etc.)

### ⏳ Not Yet Built / Needs Work
1. **Phase 0 — Cleanup**: Delete junk files, update docs, update CLAUDE.md, README.md
2. **Phase 0 — CI/CD**: GitHub Actions workflow, SonarCloud config
3. **Phase 1 — Frontend Pages**: Most pages in `frontend/src/pages/` need full implementation
4. **Phase 2 — Social Feed**: Feed endpoints, posts with reactions/comments, stories, utility links
5. **Phase 6 — Business Dashboard**: Client CRM, invoice generation, workspace switching
6. **Phase 7 — Payments**: Stripe Connect integration, payout to providers
7. **Phase 8 — Admin**: Media audit, analytics dashboard, utility link management, commission tracking
8. **Prisma Extensions**: UserAddress, BusinessVerification, BusinessTrustScore, UtilityLink, Invoice, WorkspaceSocialRole, normalizedEmail
9. **New Backend Endpoints**: Feed, posts CRUD, utility links, business CRM, admin media, admin utility links

---

## Implementation Phases

### PHASE 0 — CLEANUP & BOOTSTRAP

**Goal:** Remove stale files, update documentation, set up CI/CD.

#### Step 0.1 — Delete Junk Files
```bash
rm -rf repoversion2/ temp_version2/ scratch/
rm -f admin_audit.png admin_users.png admin_users_direct.png admin_users_success.png
rm -f flutter_audit.png flutter_audit_v2.png flutter_auth.png
rm -f login_debug.png login_mobile.png react_audit.png react_auth_desktop.png
rm -f .backend.pid .flutter.pid sync-from-version2.sh provider-ui-mock.html
```

#### Step 0.2 — Update .gitignore
Add: `*.pid`, `.backend.pid`, `.flutter.pid`, `*.png` (with exceptions), `coverage/`, `frontend/coverage/`, `dist/`, `frontend/dist/`

#### Step 0.3 — Update docs/
- Copy `files/ROADMAP.md` → `docs/ROADMAP.md`
- Copy `files/FEATURES.md` → `docs/FEATURES.md`
- Copy `files/AGENTS.md` → `docs/AGENTS.md`
- Keep existing: `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`

#### Step 0.4 — Update CLAUDE.md
Replace with pointer to `files/START_HERE.md` and `docs/` files.

#### Step 0.5 — Update README.md
Rewrite with Neighborly 2.0 description, stack, and getting started guide.

#### Step 0.6 — CI/CD Pipeline
- Create `.github/workflows/ci.yml` with lint, typecheck, test (backend + frontend), sonar, docker-build, deploy
- Create `sonar-project.properties` at root

#### Step 0.7 — Commit
```bash
git add -A && git commit -m "chore(cleanup): remove backup folders, stale PNGs, and legacy scripts"
```

---

### PHASE 1 — PRISMA SCHEMA EXTENSIONS

**Goal:** Add new models needed for v2 features without deleting existing ones.

#### Models to Add:
1. `UserAddress` — with addressTag and categoryTags fields
2. `BusinessVerification` — license + insurance verification
3. `BusinessTrustScore` — KYC + license + insurance + avgRating = totalScore
4. `UtilityLink` + `UtilityLinkClick` — admin-curated public links
5. `Invoice` + `InvoiceStatus` enum
6. `WorkspaceSocialRole` — social media manager role assignment
7. `normalizedEmail` field on `User` model with `@unique` constraint
8. Enhanced `Post` model (replace existing simple Post with full social feed model)
9. `MediaAsset` model + `ModerationStatus` enum
10. `PostReaction` + `PostComment` models

#### After Schema Changes:
```bash
npx prisma migrate dev --name "add_neighborly_v2_models"
npx prisma generate
```

---

### PHASE 2 — NEW BACKEND ENDPOINTS

**Goal:** Add missing API routes for social feed, business CRM, admin media, utility links.

#### Social Feed Endpoints:
- `GET /api/feed` — personalized feed (auth optional)
- `GET /api/feed/public` — public feed (no auth)
- `POST /api/posts` — create post/video
- `GET /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/react`
- `POST /api/posts/:id/comment`
- `GET /api/posts/:id/comments`
- `GET /api/utility-links` — admin-curated public links

#### Business CRM Endpoints:
- `GET /api/workspaces/:id/clients`
- `GET /api/workspaces/:id/clients/:clientId`
- `POST /api/workspaces/:id/invoices`
- `GET /api/workspaces/:id/invoices`
- `GET /api/workspaces/:id/invoices/:invoiceId`
- `PUT /api/workspaces/:id/invoices/:invoiceId`
- `POST /api/workspaces/:id/invoices/:invoiceId/send`

#### Admin Media Endpoints:
- `GET /api/admin/media` — all uploaded media + audit status
- `GET /api/admin/media/:id`
- `POST /api/admin/media/:id/moderate` — approve/remove/warn
- `GET /api/admin/media/stats` — engagement metrics

#### Admin Utility Links Endpoints:
- `GET /api/admin/utility-links`
- `POST /api/admin/utility-links`
- `PUT /api/admin/utility-links/:id`
- `DELETE /api/admin/utility-links/:id`
- `GET /api/admin/utility-links/:id/clicks` — referral analytics

---

### PHASE 3 — FRONTEND: AUTH & LAYOUT

**Goal:** Complete auth flow, layouts, and routing.

#### Tasks:
1. Complete `frontend/src/lib/api.ts` — Axios instance with auth interceptor, token refresh, error handling
2. Complete `frontend/src/store/authStore.ts` — Zustand store with login, register, logout, refresh
3. Complete `frontend/src/store/uiStore.ts` — UI state (sidebar, theme, notifications)
4. Complete `frontend/src/hooks/useAuth.ts` — Auth hook wrapping store
5. Complete `frontend/src/hooks/useLocationFilter.ts` — Location-based filtering
6. Complete layout components with proper navigation:
   - `PublicLayout.tsx` — header, footer, bottom nav (3 tabs: HOME, EXPLORER, SERVICES)
   - `CustomerLayout.tsx` — bottom nav, profile avatar in header
   - `BusinessLayout.tsx` — company logo, hamburger menu, bottom nav (3 tabs)
   - `AdminLayout.tsx` — sidebar nav, top bar
7. Complete `frontend/src/app/providers.tsx` — QueryClient, Auth, Theme providers

---

### PHASE 4 — FRONTEND: PUBLIC PAGES

**Goal:** Build public-facing pages (no auth required).

#### Pages:
1. **Feed.tsx** — Public social feed with posts grid, stories row, category filter
2. **Explore.tsx** — Discovery page with stories row, post feed, General/Business sub-tabs
3. **ServiceDetail.tsx** — Service catalog item detail with booking CTA
4. **Login.tsx** — Email/password login, Google OAuth, forgot password link
5. **Register.tsx** — Registration with email, phone, first/last name

---

### PHASE 5 — FRONTEND: CUSTOMER DASHBOARD

**Goal:** Build customer-facing pages (auth required, role: CUSTOMER).

#### Pages:
1. **CustomerHome.tsx** — Home tab with:
   - Neighbourhood banner (weather, alerts)
   - Utility icons row (banks, insurance, fuel, etc.)
   - Search box (20%+ screen height)
   - Local news & events feed
   - Sub-tabs: HOME, MY POSTS
2. **MyOrders.tsx** — Active orders + completed jobs history table
3. **OrderDetail.tsx** — Order detail with tabs: Details, Contract, Chat
4. **Messages.tsx** — Chat hub with conversation list + chat thread
5. **Profile.tsx** — Profile management, KYC status, "Register My Business" CTA

#### Components:
- `FeedCard.tsx` — Post card with reactions, comments, actions
- `VideoPlayer.tsx` — Video playback component
- `PostForm.tsx` — Post creation form
- `OrderWizard.tsx` — Multi-step order creation wizard
- `OrderCard.tsx` — Order summary card
- `ChatThread.tsx` — Message thread with PII guard
- `ContractFlow.tsx` — Contract generation and approval flow

---

### PHASE 6 — FRONTEND: BUSINESS DASHBOARD

**Goal:** Build business/provider-facing pages (auth required, role: PROVIDER/BUSINESS_OWNER/EMPLOYEE).

#### Pages:
1. **BusinessDashboard.tsx** — Stats cards, performance cards, AI insights panel
2. **Inbox.tsx** — Active offers, history, completed orders table
3. **Schedule.tsx** — Calendar view of scheduled jobs
4. **Clients.tsx** — Client CRM list with contact history
5. **Finance.tsx** — Transactions table, payment gateway setup
6. **Social.tsx** — Social media manager (posts, stories, comments)

#### Components:
- `InboxDrawer.tsx` — Offer detail drawer with accept/decline/counter
- `InvoiceForm.tsx` — Invoice creation form

---

### PHASE 7 — FRONTEND: ADMIN PANEL

**Goal:** Build admin-facing pages (auth required, role: ADMIN).

#### Pages:
1. **AdminDashboard.tsx** — Overview stats, audit log feed, quick actions
2. **Users.tsx** — User CRM with filters, segments, detail drawer
3. **KYC.tsx** — KYC review queue with document viewer
4. **Orders.tsx** — Order management with filters
5. **Contracts.tsx** — Contract review queue
6. **Payments.tsx** — Payment ledger
7. **Media.tsx** — Media audit with moderation actions
8. **Analytics.tsx** — Charts and metrics dashboard

#### Components:
- `KycReviewDrawer.tsx` — KYC submission review with AI verdict
- `FormBuilder.tsx` — Drag-and-drop form builder for KYC schemas
- `MediaAuditTable.tsx` — Media assets table with moderation controls

---

### PHASE 8 — FRONTEND: SERVICE LAYER & STATE

**Goal:** Complete all API service files and state management.

#### Service Files:
- `frontend/src/services/auth.ts` — Login, register, refresh, logout
- `frontend/src/services/orders.ts` — Order CRUD, wizard
- `frontend/src/services/services.ts` — Service catalog, search
- `frontend/src/services/chat.ts` — Chat messages, threads
- `frontend/src/services/kyc.ts` — KYC submissions
- `frontend/src/services/admin/adminUsers.ts` — Admin user management
- `frontend/src/services/admin/adminOrders.ts` — Admin order management
- `frontend/src/services/admin/adminKyc.ts` — Admin KYC review
- `frontend/src/services/admin/adminMedia.ts` — Admin media audit

---

### PHASE 9 — PAYMENT GATEWAY INTEGRATION

**Goal:** Integrate Stripe Connect for payment processing.

#### Tasks:
1. Create Stripe Connect OAuth flow for businesses
2. Implement payment session creation (post-contract approval)
3. Implement escrow holding and fund release
4. Implement commission auto-split
5. Add PayPal Business adapter
6. Add Interac e-Transfer support (manual reconciliation)
7. Add Square integration
8. Admin payment ledger with Stripe Connect overview

---

### PHASE 10 — TESTING & QUALITY

**Goal:** Ensure ≥70% coverage, TypeScript strict mode, ESLint clean.

#### Tasks:
1. Write backend unit tests for all new endpoints
2. Write frontend component tests with Vitest + Testing Library
3. Set up coverage thresholds
4. Fix all TypeScript strict mode errors
5. Fix all ESLint errors
6. Run SonarCloud analysis and fix blockers/criticals

---

## File Structure Summary

### New Backend Files to Create:
```
routes/feed.ts                    — Feed endpoints
routes/utilityLinks.ts            — Public utility links
routes/adminMedia.ts              — Admin media audit
routes/adminUtilityLinks.ts       — Admin utility link CRUD
lib/feed.ts                       — Feed business logic
lib/invoice.ts                    — Invoice generation logic
lib/utilityLinks.ts               — Utility link business logic
```

### New Frontend Files to Create (in `frontend/src/`):
```
pages/customer/Profile.tsx
pages/admin/Users.tsx
pages/admin/KYC.tsx
pages/admin/Orders.tsx
pages/admin/Contracts.tsx
pages/admin/Payments.tsx
pages/admin/Media.tsx
pages/admin/Analytics.tsx
components/social/FeedCard.tsx
components/social/VideoPlayer.tsx
components/social/PostForm.tsx
components/orders/OrderWizard.tsx
components/chat/ChatThread.tsx
components/chat/ContractFlow.tsx
components/business/InboxDrawer.tsx
components/business/InvoiceForm.tsx
components/admin/KycReviewDrawer.tsx
components/admin/FormBuilder.tsx
components/admin/MediaAuditTable.tsx
services/admin/adminUsers.ts
services/admin/adminOrders.ts
services/admin/adminKyc.ts
services/admin/adminMedia.ts
```

### Files to Update:
```
prisma/schema.prisma               — Add new models
server.ts                          — Mount new routes
frontend/src/app/router.tsx        — Add admin sub-routes
frontend/src/app/providers.tsx     — Add auth provider
frontend/src/lib/api.ts            — Complete Axios instance
frontend/src/store/authStore.ts    — Complete auth store
frontend/src/store/uiStore.ts      — Complete UI store
```

---

## Key Architecture Decisions

1. **Frontend uses the existing backend API** — no new API gateway needed
2. **Zustand for auth/UI state** — TanStack Query for server state
3. **React Router v6** for routing with nested layouts
4. **shadcn/ui** components for consistent UI (installed via CLI)
5. **All monetary values in cents** (integers) in backend, formatted in frontend
6. **No Persian/Farsi** in code, comments, commits, or logs
7. **Never delete DB columns** — use `archivedAt` for soft-delete
8. **No business logic in React components** — extract to hooks/services
9. **Every new function needs a unit test** with ≥70% coverage
10. **Commit after each logical unit of work** — small, clear commits
