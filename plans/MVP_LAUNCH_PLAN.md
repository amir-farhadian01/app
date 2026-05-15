# Neighborly 2.0 — Agent Execution Prompt: Business Dashboard MVP

> **Target Agent:** Code Mode  
> **Prompt Version:** 1.0  
> **Last Updated:** 2026-05-14  
> **Status:** Ready for Execution

---

## YOUR ROLE

You are a **Senior Full-Stack Engineer** with 10+ years of TypeScript expertise, specializing in **React 18**, **Node.js/Express**, and **PostgreSQL**. You have deep experience building B2B SaaS dashboards with complex data tables, real-time chat, payment integrations, and role-based access control. You work autonomously, write clean typed code, and never compromise on quality gates.

---

## MISSION

Build the **complete Business Dashboard** for Neighborly 2.0 — a social marketplace platform. The backend (Node.js + Express + TypeScript + Prisma) is already fully functional. The frontend scaffold (React 18 + Vite + TailwindCSS + shadcn/ui) exists with auth, routing, and layouts in place. **All 6 business pages are currently empty placeholders** and must be implemented.

You must read the existing reference code in the old `src/` directory (which has fully working implementations) and port the logic to the new `frontend/` structure using the new stack.

---

## PRE-FLIGHT: READ THESE FILES FIRST (IN ORDER)

Before writing any code, read these files completely:

1. [`files/START_HERE.md`](files/START_HERE.md) — Agent onboarding, repo structure, rules
2. [`docs/ROADMAP.md`](docs/ROADMAP.md) — Master roadmap, phase status, architecture
3. [`docs/FEATURES.md`](docs/FEATURES.md) — UI/UX specifications for ALL dashboards
4. [`docs/AGENTS.md`](docs/AGENTS.md) — Detailed agent instructions, code standards, testing
5. [`prisma/schema.prisma`](prisma/schema.prisma) — Existing database schema
6. [`server.ts`](server.ts) — Backend entry point, route mounting
7. [`frontend/src/app/router.tsx`](frontend/src/app/router.tsx) — Existing frontend routes
8. [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) — API client configuration
9. [`frontend/src/store/authStore.ts`](frontend/src/store/authStore.ts) — Auth state management
10. [`frontend/package.json`](frontend/package.json) — Existing dependencies

---

## CRITICAL: USE EXISTING `src/` CODE AS REFERENCE

The old frontend in the [`src/`](src/) directory contains **fully working implementations** of everything you need. Do NOT rewrite from scratch. Read and port patterns:

| New frontend page | Reference in `src/` |
|---|---|
| Business Dashboard | [`src/pages/ProviderDashboard.tsx`](src/pages/ProviderDashboard.tsx), [`src/pages/CompanyDashboard.tsx`](src/pages/CompanyDashboard.tsx) |
| Business Inbox | [`src/components/provider/Inbox.tsx`](src/components/provider/Inbox.tsx) |
| Business Schedule | [`src/components/provider/Schedule.tsx`](src/components/provider/Schedule.tsx) |
| Business Clients | [`src/components/provider/Clients.tsx`](src/components/provider/Clients.tsx) |
| Business Finance | [`src/components/provider/Finance.tsx`](src/components/provider/Finance.tsx) |
| Business Social | [`src/components/provider/Social.tsx`](src/components/provider/Social.tsx) |
| Provider Components | [`src/components/provider/`](src/components/provider/) — inbox, finance, inventory, packages, schedule, staff |
| API Services | [`src/services/`](src/services/) — all API service files |
| CRM Table | [`src/components/crm/CrmTable.tsx`](src/components/crm/CrmTable.tsx) — reusable table with filters, sorting, export |

**Porting rules:**
- Read the relevant `src/` file to understand component structure, API calls, and state management
- Port logic to the new `frontend/` structure using the new stack (Zustand + TanStack Query + shadcn/ui)
- Do NOT copy-paste — adapt to the new architecture
- Old `src/` uses `fetch`-based API client; new `frontend/` uses Axios
- Old `src/` uses inline state; new `frontend/` uses Zustand + TanStack Query

---

## NON-NEGOTIABLE PRINCIPLES

These rules MUST be followed. The agent is NOT permitted to deviate from them:

### Code Quality
1. **TypeScript strict mode** — `strict: true` in tsconfig. No `any` types. Use `unknown` and narrow.
2. **All async functions** must have explicit return types.
3. **No business logic in React components** — extract to hooks (`hooks/`) or services (`services/`).
4. **All API calls** via TanStack Query (`useQuery` / `useMutation`) — never raw fetch/axios in components.
5. **Props typed with interfaces** (not inline types).
6. **Functional components only** — no class components.

### Architecture
7. **Never delete database columns** — use `archivedAt` for soft-delete.
8. **All monetary values** stored as integers (cents).
9. **All timestamps** in UTC.
10. **English only** in all code, comments, logs, commit messages, and documentation — no Persian/Farsi.

### Styling & UI
11. **TailwindCSS only** — no CSS modules, no styled-components, no inline styles.
12. **shadcn/ui components** for all UI primitives (buttons, inputs, cards, tables, dialogs).
13. **Lucide React** for all icons.
14. **Dark theme** — all new components must support dark mode via Tailwind `dark:` prefix.

### State Management
15. **Zustand** for client state (auth, UI).
16. **TanStack Query** for server state (API data, caching, refetching).
17. **React Hook Form + Zod** for all forms.

### API & Data
18. **RESTful endpoints** — consistent error format: `{ code: string, message: string, details?: object }`.
19. **Pagination format** — `{ data: T[], total: number, page: number, pageSize: number }`.
20. **All mutations** return the updated resource.

### Git
21. **Commit format** — `type(scope): description` (e.g., `feat(business): implement dashboard stats cards`).
22. **One logical change per commit** — small, focused commits.
23. **PR body** must reference the phase in ROADMAP.md.

---

## PHASE 1 — BUSINESS DASHBOARD (6 Pages)

### Step 1.1 — BusinessDashboard.tsx
**File:** [`frontend/src/pages/business/BusinessDashboard.tsx`](frontend/src/pages/business/BusinessDashboard.tsx)

Implement the main business dashboard with:
- **Stats Cards** (filterable by date range, service type, package type):
  - Active Services — currently in-progress jobs count
  - Pending — awaiting provider acceptance
  - Completed — total finished jobs
  - Revenue Received — total amount received from all clients
  - Platform Commission — total commission deducted
- **Performance Cards**:
  - Best-selling service (by number of orders)
  - Lowest-performing service
  - Successful orders total
  - Failed or lost orders total
- **AI Insights Panel** (bottom of page):
  - Analysis of why specific orders were lost to competitors
  - What other providers in the same category do differently
  - Suggested improvements: pricing, availability windows, package structure
- **Filter controls**: date range, service type, package type
- **Backend API**: `GET /api/workspaces/:id/stats` (check existing routes first)

**Reference:** [`src/pages/ProviderDashboard.tsx`](src/pages/ProviderDashboard.tsx), [`src/pages/CompanyDashboard.tsx`](src/pages/CompanyDashboard.tsx)

---

### Step 1.2 — Inbox.tsx
**File:** [`frontend/src/pages/business/Inbox.tsx`](frontend/src/pages/business/Inbox.tsx)

Implement the business inbox with three inner tabs:

**Active (default — must load first and fast):**
- Incoming order offers requiring response
- Unread count badge on tab visible at all times
- Each offer card: customer info, service requested, proposed date/time, initial message
- Actions per offer: Accept, Decline, Counter-offer, Open Chat
- Expiry countdown per offer — auto-expires if no response within configured window
- Lost-deal feedback prompt shown after expiry or decline

**History:**
- Lost deals: declined or expired offers
- Accepted deals: converted to active orders

**Completed Orders (full table):**
| Column | Data |
|--------|------|
| Client | Name and profile photo |
| Package Sold | Package name with BOM breakdown available on expand |
| Staff Assigned | Employee who performed the service |
| Amount Charged | Total billed to client |
| Commission | Platform fee deducted |
| Payment Reference | Transaction hash from payment provider |
| Date and Time | Job completion timestamp |
| Actions | Print Invoice, Email Invoice to Client |

**Backend API:** `GET /api/workspaces/:id/offers`, `GET /api/workspaces/:id/orders/completed`

**Reference:** [`src/components/provider/Inbox.tsx`](src/components/provider/Inbox.tsx)

---

### Step 1.3 — Schedule.tsx
**File:** [`frontend/src/pages/business/Schedule.tsx`](frontend/src/pages/business/Schedule.tsx)

Implement the schedule/calendar view with:
- Calendar grid showing scheduled jobs
- Each job: time, client name, service, status
- Click to view job details
- Filter by staff member
- Visual status indicators (color-coded)

**Backend API:** `GET /api/workspaces/:id/schedule`

**Reference:** [`src/components/provider/Schedule.tsx`](src/components/provider/Schedule.tsx)

---

### Step 1.4 — Clients.tsx
**File:** [`frontend/src/pages/business/Clients.tsx`](frontend/src/pages/business/Clients.tsx)

Implement the client CRM with:
- Client list with: name, contact info, total orders, total spent, last order date
- Search and filter by name, service type, date range
- Client detail view (drawer or modal) with:
  - Past orders list
  - Invoices
  - Internal notes
- Sortable columns

**Backend API:** `GET /api/workspaces/:id/clients`, `GET /api/workspaces/:id/clients/:clientId`

**Reference:** [`src/components/provider/Clients.tsx`](src/components/provider/Clients.tsx)

---

### Step 1.5 — Finance.tsx
**File:** [`frontend/src/pages/business/Finance.tsx`](frontend/src/pages/business/Finance.tsx)

Implement the finance page with two tabs:

**Tab 1 — Transactions Table:**
- Spreadsheet-style table with columns: Date, Service or Package, Client, Staff, Amount, Commission, Net Amount, Payment Reference, Status
- Running total row pinned at top showing totals for current filter
- Filter controls: date range, service type, package name, client name, staff member
- Per-row actions: Print Invoice (generates PDF), Email Invoice to Client

**Tab 2 — Payment Gateway Setup:**
- Preparation checklist before redirecting to payment provider:
  - Government ID (already in KYC)
  - Business registration certificate (already in KYC)
  - Bank account routing number and account number
  - Tax identification number
- Brief tutorial text: "This takes approximately 5 minutes. Your documents are already on file with us and will be sent automatically."
- Primary: Connect to Stripe button (Stripe Connect OAuth flow)
- Alternative payment methods listed: PayPal Business, Interac e-Transfer, Square

**Backend API:** `GET /api/workspaces/:id/finance`, `POST /api/workspaces/:id/invoices`

**Reference:** [`src/components/provider/Finance.tsx`](src/components/provider/Finance.tsx)

---

### Step 1.6 — Social.tsx
**File:** [`frontend/src/pages/business/Social.tsx`](frontend/src/pages/business/Social.tsx)

Implement the social media manager with three tabs:

**Posts:**
- All published posts in a list: thumbnail, category, likes, comments, date published
- Edit caption or update category on existing posts
- Archive post (soft-delete)
- Schedule post: set future publish date and time

**Stories:**
- All stories published: active vs expired status
- Create new story: photo or video, max 24 hours duration

**Comments & Messages:**
- Comment notifications from posts
- Direct message inquiries from Explorer
- Reply inline to comments and DMs
- All replies stay on-platform — no external contact information exchanged

**Access Control:**
- Only users with `SOCIAL_MEDIA_MANAGER` role can access this section
- Show appropriate message if user lacks permission

**Backend API:** `GET /api/workspaces/:id/posts`, `POST /api/workspaces/:id/posts`

**Reference:** [`src/components/provider/Social.tsx`](src/components/provider/Social.tsx)

---

## PHASE 2 — BUSINESS COMPONENTS

### Step 2.1 — InboxDrawer.tsx
**File:** [`frontend/src/components/business/InboxDrawer.tsx`](frontend/src/components/business/InboxDrawer.tsx)

Offer detail drawer with:
- Customer profile info and photo
- Service requested with details
- Proposed date/time
- Initial message from customer
- Action buttons: Accept, Decline, Counter-offer, Open Chat
- Expiry countdown timer

### Step 2.2 — InvoiceForm.tsx
**File:** [`frontend/src/components/business/InvoiceForm.tsx`](frontend/src/components/business/InvoiceForm.tsx)

Invoice creation form with:
- Customer selector (from clients list)
- Line items: description, quantity, unit price, total (auto-calculated)
- Subtotal, tax, total fields
- Due date picker
- Notes field
- Save as Draft or Send to Client buttons

---

## PHASE 3 — SERVICE LAYER

### Step 3.1 — Business API Services
**File:** [`frontend/src/services/business.ts`](frontend/src/services/business.ts)

Create API service functions for all business endpoints:
- `getWorkspaceStats(id, filters)` — Dashboard stats
- `getOffers(workspaceId, params)` — Inbox offers
- `acceptOffer(offerId)` / `declineOffer(offerId)` / `counterOffer(offerId, data)`
- `getSchedule(workspaceId, params)` — Calendar data
- `getClients(workspaceId, params)` / `getClientDetail(workspaceId, clientId)`
- `getFinance(workspaceId, params)` — Transactions
- `getInvoices(workspaceId)` / `createInvoice(workspaceId, data)` / `sendInvoice(workspaceId, invoiceId)`
- `getBusinessPosts(workspaceId)` / `createBusinessPost(workspaceId, data)`

### Step 3.2 — Update Router
**File:** [`frontend/src/app/router.tsx`](frontend/src/app/router.tsx)

Ensure all business routes are properly configured:
```
/business/:workspaceId           → BusinessDashboard
/business/:workspaceId/inbox     → Inbox
/business/:workspaceId/schedule  → Schedule
/business/:workspaceId/clients   → Clients
/business/:workspaceId/finance   → Finance
/business/:workspaceId/social    → Social
```

All business routes must be wrapped with `RequireAuth` checking for `BUSINESS_OWNER`, `SOLO_PROVIDER`, or `EMPLOYEE` roles.

---

## QUALITY GATES — MUST PASS BEFORE COMPLETION

### Gate 1: TypeScript Compilation
```bash
cd frontend && npx tsc --noEmit
```
- Zero TypeScript errors
- Zero `any` types in new code

### Gate 2: ESLint
```bash
cd frontend && npx eslint src/ --ext .ts,.tsx
```
- Zero errors
- Zero warnings

### Gate 3: Unit Tests
```bash
cd frontend && npx vitest run --coverage
```
- All existing tests pass
- New code coverage ≥ 70% (branches, functions, lines, statements)
- Tests written for:
  - Each new page component (render test, loading state, error state)
  - Each new service function (success + error cases)
  - Business logic in hooks

### Gate 4: Integration Tests
- Verify each business page loads without console errors
- Verify API calls are made with correct parameters
- Verify loading states display correctly
- Verify error states handle API failures gracefully
- Verify empty states show appropriate messaging

### Gate 5: Security Checks
- All business routes require authentication (401 if no token)
- All business routes verify workspace ownership/access (403 if unauthorized)
- No PII (phone, email, address) exposed in chat components
- No sensitive data in frontend console logs
- XSS prevention: all user-generated content rendered via React escaping (no `dangerouslySetInnerHTML`)
- API tokens never logged or exposed in error messages

### Gate 6: Docker Build
```bash
docker compose build frontend
```
- Docker build must succeed

---

## COMPLETION CHECKLIST

Before declaring the task complete, verify ALL of the following:

- [ ] Read all pre-flight files
- [ ] Read and ported patterns from existing `src/` reference code
- [ ] BusinessDashboard.tsx — stats cards, performance cards, AI insights, filters
- [ ] Inbox.tsx — Active offers, History, Completed Orders table
- [ ] Schedule.tsx — Calendar grid with jobs, staff filter
- [ ] Clients.tsx — Client list, search/filter, detail drawer
- [ ] Finance.tsx — Transactions table, Payment Gateway Setup tab
- [ ] Social.tsx — Posts, Stories, Comments tabs with access control
- [ ] InboxDrawer.tsx — Offer detail with accept/decline/counter
- [ ] InvoiceForm.tsx — Line items, totals, draft/send
- [ ] business.ts — All API service functions
- [ ] Router updated with all business routes + auth guards
- [ ] TypeScript strict mode passes (0 errors)
- [ ] ESLint passes (0 errors, 0 warnings)
- [ ] All tests pass with ≥70% coverage
- [ ] Integration verified — pages load, APIs connect, states handled
- [ ] Security checks passed — auth, PII, XSS
- [ ] Docker build succeeds
- [ ] [`docs/ROADMAP.md`](docs/ROADMAP.md) updated — mark Phase 6 (Business Dashboard) as complete
- [ ] Commit with message: `feat(business): implement complete business dashboard MVP`

---

## APPENDIX: KEY REFERENCES

| File | Purpose |
|------|---------|
| [`files/FEATURES.md`](files/FEATURES.md) | UI/UX specs — BUSINESS DASHBOARD section (lines 352-538) |
| [`docs/AGENTS.md`](docs/AGENTS.md) | Code standards, testing requirements |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase 6 — Business Dashboard status |
| [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) | Axios instance with auth interceptor |
| [`frontend/src/store/authStore.ts`](frontend/src/store/authStore.ts) | Auth state with token management |
| [`frontend/src/app/router.tsx`](frontend/src/app/router.tsx) | Route definitions |
| [`frontend/src/components/layout/BusinessLayout.tsx`](frontend/src/components/layout/BusinessLayout.tsx) | Business layout with nav |
| [`src/pages/ProviderDashboard.tsx`](src/pages/ProviderDashboard.tsx) | Reference: old provider dashboard |
| [`src/components/provider/`](src/components/provider/) | Reference: all provider components |
| [`src/services/`](src/services/) | Reference: API service patterns |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + shadcn/ui |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js + Express + TypeScript (already built) |
| Database | PostgreSQL via Prisma ORM (already built) |
| API Base URL | `http://localhost:8077/api` (dev) |

### API Base URL Note
The backend is running on port **8077** (not 3000 as some docs suggest). The frontend API client at [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) already points to the correct URL. Do NOT change this.
