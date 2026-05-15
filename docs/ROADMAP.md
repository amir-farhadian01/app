# Neighborly 2.0 — Master Roadmap (Living Document)

**Version:** 2.0.0  
**Last Updated:** 2026-05-09  
**Status Legend:** ✅ Done · 🚧 In Progress · ⏳ Planned · ❌ Blocked  

> ⚠️ THIS IS THE SOURCE OF TRUTH.
> Every agent, every PR, every sprint MUST read this file BEFORE writing code.
> Run `npm run docs:check` first to detect drift.

---

## 1. Product Vision

Neighborly is a **social marketplace platform** — part Instagram, part TaskRabbit, part Groupon — where:

- **Regular users** browse, discover, and share skills/services like a social feed
- **Solo providers** list personal services (barbering, gardening, baking, etc.)
- **Corporate businesses** manage employees, clients, invoices, and bookings
- **Any business vertical** is supported: beauty, auto repair, home services, transport, food, events, etc.
- **Transport layer (V2):** Uber-like ride/delivery dispatch (motorbike → truck)

The app is **location-aware** and **interest-filtered**: each user sees a feed tailored to their neighbourhood and preferences.

All users (business and personal) undergo **KYC verification** by admin before activation.

---

## 2. User Types

| Type | Description |
|------|-------------|
| `PUBLIC_VIEWER` | Unauthenticated — can browse public feed and search |
| `CUSTOMER` | Registered user — books services, shares posts |
| `SOLO_PROVIDER` | Individual offering services under personal brand |
| `BUSINESS_OWNER` | Corporate account with employees and clients |
| `EMPLOYEE` | Staff member of a business; may also operate independently |
| `ADMIN` | Platform operator with full access |

> One person can hold multiple roles across multiple businesses simultaneously.

---

## 3. Platform Surfaces

```
┌──────────────────────────────────────────────────────┐
│  PUBLIC FEED (Social Layer — Instagram-like)         │
│  Videos · Posts · Stories · Services Discovery      │
├──────────────────────────────────────────────────────┤
│  CUSTOMER DASHBOARD                                  │
│  Browse · Book · Track Orders · Chat · Profile       │
├──────────────────────────────────────────────────────┤
│  BUSINESS / PROVIDER DASHBOARD                       │
│  Services · Clients · Invoices · Schedule · Finance  │
├──────────────────────────────────────────────────────┤
│  ADMIN PANEL                                         │
│  KYC · CRM · Orders · Contracts · Analytics · Media  │
└──────────────────────────────────────────────────────┘
```

---

## 4. Phase Matrix

### Phase 0 — Cleanup & Frontend Bootstrap

**Goal:** Remove stale files, introduce new React frontend shell alongside existing backend.

| Track | Status | Notes |
|-------|--------|-------|
| Delete `repoversion2/`, `temp_version2/`, `scratch/` | ⏳ | Agent task — see AGENTS.md |
| Delete root-level screenshot PNGs | ⏳ | Agent task |
| Delete `sync-from-version2.sh`, `.backend.pid`, `.flutter.pid` | ⏳ | Agent task |
| Archive old `docs/` and replace with this set | ⏳ | Agent task |
| Scaffold new React frontend in `/frontend/` | ⏳ | Vite + React + TailwindCSS + shadcn/ui |
| CI/CD pipeline baseline (GitHub Actions) | ⏳ | Lint + Test + Build gate |
| SonarCloud integration | ⏳ | Quality gate: coverage ≥70%, 0 blockers |
| Docker Compose unified (backend + frontend + db) | ⏳ | Single `docker-compose up` |

---

### Phase 1 — Auth, KYC & Identity

**Goal:** Every user is verified before accessing platform features.

| Track | Customer | Provider | Admin | Status |
|-------|----------|----------|-------|--------|
| JWT Auth (register/login/refresh/logout) | ✅ | ✅ | ✅ | ✅ Done |
| KYC Level 0 (email + phone verify) | ✅ | ✅ | ✅ | ✅ Done |
| KYC Level 1 (government ID upload) | ✅ | ✅ | ✅ | ✅ Done |
| KYC Level 2 (business registration docs) | ⏳ | ✅ | ✅ | 🚧 In Progress |
| Admin KYC review queue | — | — | ✅ | ✅ Done |
| Profile photo enforcement for providers | ⏳ | ⏳ | — | ⏳ Planned |
| Multi-role support (person in multiple businesses) | ⏳ | ⏳ | — | ⏳ Planned |

> **Security requirement:** Any service provider who visits a client's location (or receives a client) MUST have a verified profile photo visible to the client for identity confirmation.

---

### Phase 2 — Social Feed (Public & Personal)

**Goal:** Instagram-like feed with algorithmic content delivery based on location + interests.

| Feature | Status | Notes |
|---------|--------|-------|
| Public video/photo posts | ⏳ | Both business and regular users |
| Personal feed (interest + location filtering) | ⏳ | Gender/interest personalization |
| Business content sharing (promotional videos) | ⏳ | Links to bookable services |
| Public utility links (banks, insurance, fuel prices) | ⏳ | Admin-curated, commission-tracked referrals |
| Follow / Unfollow | ⏳ | |
| Reactions + Comments | ⏳ | |
| Stories (24h ephemeral) | ⏳ | |
| Content moderation queue (admin) | ⏳ | Integrated with video audit DB already in place |
| Video transcoding pipeline | ⏳ | Mux or equivalent, metadata in DB |
| Media analytics (views, engagement) | ⏳ | Admin dashboard charts |

---

### Phase 3 — Service Catalog & Booking Engine

**Goal:** Any business type can configure services with flexible booking modes.

| Feature | Status | Notes |
|---------|--------|-------|
| Hierarchical category tree (≤5 levels) | ✅ | Admin manages |
| Service definition with dynamic field schema | ✅ | Powers booking wizard |
| Booking mode: **Fixed price** (direct appointment) | ✅ | Like Groupon |
| Booking mode: **Negotiable** (price + date + details) | ✅ | Like TaskRabbit/Jiffy |
| Booking mode: **Inventory-based** (custom package) | ✅ | Client selects parts/products |
| Booking mode: **Hybrid** (negotiable date + fixed inventory) | ⏳ | |
| Auto-appointment (no negotiation) | ✅ | Business configures per service |
| Provider sets booking mode per service | ✅ | `lockedBookingMode` in schema |
| Package builder with BOM (Bill of Materials) | ✅ | |
| Inventory management (products/parts) | ✅ | |

---

### Phase 4 — Order Lifecycle

**Goal:** Full order journey from creation to review.

| Stage | Status |
|-------|--------|
| Order wizard (3 entry points) | ✅ |
| Draft / autosave | ✅ |
| Dynamic fields per service | ✅ |
| Photo attachments | ✅ |
| Submit + matching trigger | ✅ |
| Provider notification | ✅ |
| Negotiation chat | ✅ |
| Contract generation (AI-assisted) | ✅ |
| Contract versioning + approval | ✅ |
| Payment gate (contract must be approved) | ✅ |
| Order completion + review | ✅ |
| Dispute filing | ✅ |
| Admin order management | ✅ |

---

### Phase 5 — Matching Engine

| Feature | Status |
|---------|--------|
| Auto-book matching | ✅ |
| Round-robin (5 providers) | ✅ |
| Provider eligibility checks | ✅ |
| Lazy expiry + re-match | ✅ |
| Admin override | ✅ |
| Lost-deal capture | ✅ |

---

### Phase 6 — Business (Provider) Dashboard

**Goal:** Full business management suite inside the platform.

| Feature | Status | Notes |
|---------|--------|-------|
| Workspace (company) creation | ✅ | |
| Multi-employee management | ✅ | Staff tab |
| Client (customer) management | ⏳ | CRM-lite for businesses |
| Invoice generation + sending | ⏳ | PDF invoices |
| Schedule/Calendar view | ✅ | Provider pipeline orders |
| Finance tab (earnings snapshot) | ✅ | Read-only, no gateway yet |
| Service packages management | ✅ | |
| Inventory management | ✅ | |
| Business KYC (corporate + sole trader) | ✅ | |
| Multiple businesses per person | ⏳ | UI for workspace switching |

---

### Phase 7 — Chat, Contracts & Payments

| Feature | Status |
|---------|--------|
| Order-scoped chat | ✅ |
| PII guard + moderation | ✅ |
| AI translation layer | ✅ |
| Contract drafting (AI from chat) | ✅ |
| Contract templates | ✅ |
| Payment session (post-contract) | ✅ |
| Payment gateway integration (Stripe/etc.) | ⏳ |
| Payout to providers | ⏳ |
| Admin payment ledger | ✅ |

---

### Phase 8 — Admin Control Center

| Feature | Status |
|---------|--------|
| User CRM (segments, filters, detail) | ✅ |
| KYC review queue | ✅ |
| Form builder (per business type) | ✅ |
| Order management | ✅ |
| Contract review queue | ✅ |
| Chat moderation | ✅ |
| Payments ledger | ✅ |
| Media audit (video/photo stats) | ⏳ |
| Analytics dashboard | ⏳ |
| Public utility link management | ⏳ |
| Commission tracking (referral links) | ⏳ |
| SonarQube report view | ⏳ |

---

### Phase 9 — Transport Layer (V2)

**Goal:** Uber-like dispatch for motorbikes, cars, vans, trucks.

| Feature | Status |
|---------|--------|
| Vehicle type catalog (moto → truck) | ⏳ |
| Real-time driver location tracking | ⏳ |
| Ride/delivery request flow | ⏳ |
| Driver acceptance + dispatch | ⏳ |
| Route + ETA display | ⏳ |
| Fare calculation engine | ⏳ |
| Driver rating + history | ⏳ |
| Fleet management for businesses | ⏳ |

---

## 5. Database Schema Strategy

The Prisma schema already has solid foundations. Key models to extend:

```
User → UserRole[] (multi-role)
Business → employees[] + clients[] + invoices[]
Post → media[] + location + interests[]
Service → BookingMode + inventory + dynamicFields
Order → lifecycle → Contract → Payment
JobRecord → transport extension (V2)
AuditLog → all admin actions
AnalyticsEvent → media, referral, feed
```

**Extensibility rules:**
- Never delete columns — use `archivedAt` soft-delete
- All monetary values stored as integers (cents)
- All timestamps UTC
- Media metadata stored in DB, files in object storage (S3/compatible)
- Analytics events are append-only (no updates)

---

## 6. CI/CD Standards

```
GitHub Actions Workflow:
  on: [push, pull_request]
  
  jobs:
    lint:      eslint + prettier check
    typecheck: tsc --noEmit
    test:      jest (backend) + vitest (frontend) — coverage ≥70%
    sonar:     SonarCloud analysis — 0 blockers/criticals
    build:     docker build (must succeed)
    deploy:    only on main branch + all gates passed
```

**Branch strategy:**
- `main` — production-ready, protected
- `dev` — integration branch
- `feature/*` — feature branches (PR into dev)
- `hotfix/*` — emergency fixes (PR into main)

---

## 7. Quality Standards

Every PR must pass:
1. ESLint (0 errors, 0 warnings)
2. TypeScript strict mode (0 errors)
3. Unit tests (new code ≥70% coverage)
4. SonarCloud quality gate
5. Docker build success
6. One peer review approval

---

## 8. Architecture Overview

```
/
├── src/              ← Backend (Express + TypeScript)
│   ├── routes/       ← API route handlers
│   ├── lib/          ← Business logic
│   └── middleware/   ← Auth, validation
├── frontend/         ← NEW React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/    ← Route-level pages
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── business/
│   │   │   ├── customer/
│   │   │   └── social/
│   │   ├── services/ ← API client layer
│   │   └── store/    ← Zustand state
├── flutter_project/  ← Mobile app (Flutter)
├── prisma/           ← Database schema
├── docker/           ← Service configs
└── docs/             ← This documentation set
```

---

## 9. V2 Preview — Transport Services

Coming after core platform stability:

- Ride-hailing (motorcycle, car, van, truck)
- Package delivery
- Scheduled logistics for businesses
- Driver KYC (vehicle + license verification)
- Real-time GPS tracking
- Fare rules engine per vehicle class

This will be built as a first-class service type within the existing catalog/booking framework, not a separate codebase.
