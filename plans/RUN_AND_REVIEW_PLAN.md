# Neighborly — Run All Apps & Review Duplicate Files Plan

## Project Overview

This is a **Neighborly 2.0** project — a social marketplace platform with:
- **Backend**: Node.js/Express/TypeScript (server.ts on PORT=8077, ADMIN_PORT=9090)
- **New Frontend** (`frontend/`): React + Vite + TailwindCSS + Zustand + TanStack Query
- **Old Frontend** (`src/`): Legacy React app with fully implemented Admin/Customer/Provider dashboards
- **Flutter Web** (`flutter_project/`): Flutter mobile/web client

---

## ✅ Phase 1: Backend — RUNNING

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Main API + SPA | 8077 | http://localhost:8077 | ✅ Running |
| Admin API + SPA | 9090 | http://localhost:9090 | ✅ Running |
| PostgreSQL | 5432 | - | ✅ Connected |
| Redis | 6379 | - | ⚠️ Not available (non-fatal) |
| NATS | 4222 | - | ⚠️ Not available (non-fatal) |

**Health check:** `curl http://localhost:8077/api/health` → `{"status":"ok","version":"2.0.0"}`

---

## ✅ Phase 2: New React Frontend (frontend/) — RUNNING

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Vite Dev Server | 5173 | http://localhost:5173 | ✅ Running |

### Page Implementation Status

| Route | Page | Status | Lines |
|-------|------|--------|-------|
| `/` | Feed | 🔴 **Stub** — `<div>Feed</div>` | 1 |
| `/explore` | Explore | 🔴 **Stub** — `<div>Explore</div>` | 1 |
| `/services/:id` | ServiceDetail | 🔴 **Stub** — `<div>ServiceDetail</div>` | 1 |
| `/auth/login` | Login | 🔴 **Stub** — `<div>Login</div>` | 1 |
| `/auth/register` | Register | 🔴 **Stub** — `<div>Register</div>` | 1 |
| `/app/home` | CustomerHome | 🔴 **Stub** — `<div>CustomerHome</div>` | 1 |
| `/app/orders` | MyOrders | 🟢 **Implemented** — 270 lines with tabs, filters, cancel | 270 |
| `/app/orders/:id` | OrderDetail | 🟢 **Implemented** — 366 lines with chat, contracts, payments | 366 |
| `/app/messages` | Messages | 🔴 **Stub** — `<div>Messages</div>` | 1 |
| `/business/:wsId` | BusinessDashboard | 🔴 **Stub** | 1 |
| `/business/:wsId/inbox` | Inbox | 🔴 **Stub** | 1 |
| `/business/:wsId/schedule` | Schedule | 🔴 **Stub** | 1 |
| `/business/:wsId/clients` | Clients | 🔴 **Stub** | 1 |
| `/business/:wsId/finance` | Finance | 🔴 **Stub** | 1 |
| `/business/:wsId/social` | Social | 🔴 **Stub** | 1 |
| `/admin` | AdminDashboard | 🔴 **Stub** | 1 |

---

## ✅ Phase 3: Flutter Web Client — RUNNING

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Flutter Web | 7357 | http://localhost:7357 | ✅ Running |

### Flutter App Structure
- **Screens**: 30+ screens (Admin, Customer, Provider, Auth, Explorer, Orders, KYC, Chat, etc.)
- **Services**: API service, Auth provider, Chat service, Orders service, Contracts, etc.
- **Routing**: Custom navigator with path-based routing
- **State**: Provider pattern with ChangeNotifier

---

## ✅ Phase 4: Old React Frontend (src/) — RUNNING via Backend

The old `src/` frontend is served through Vite middleware in `server.ts` on both ports 8077 and 9090.

| Feature | File | Lines | Status |
|---------|------|-------|--------|
| Admin Dashboard | `src/pages/AdminDashboard.tsx` | ~1300 | 🟢 FULL — Users, KYC, Orders, Contracts, Payments, Chat Moderation, Service Definitions, Packages, Inventory |
| Customer Dashboard | `src/pages/CustomerDashboard.tsx` | ~575 | 🟢 FULL — Home, Orders, Profile, KYC |
| Provider Dashboard | `src/pages/ProviderDashboard.tsx` | ~101 | 🟢 FULL |
| Auth | `src/pages/Auth.tsx` | Full | 🟢 FULL |
| Order Wizard | `src/components/orders/OrderWizard.tsx` | Full | 🟢 FULL — 7-step wizard |
| KYC Flow | `src/components/kyc/` | Full | 🟢 FULL — Personal + Business |
| CRM Table | `src/components/crm/CrmTable.tsx` | Full | 🟢 FULL — Reusable table |
| Provider Components | `src/components/provider/` | Full | 🟢 FULL — Inbox, Finance, Inventory, Packages, Staff |

---

## 🔍 Phase 5: Duplicate/Parallel Files Review

### Category A: `src/` (Old Frontend) vs `frontend/` (New Frontend)

These are **intentional parallel implementations** — the old `src/` is the reference, the new `frontend/` is being rebuilt with a modern stack.

| Area | Old (`src/`) | New (`frontend/`) | Verdict |
|------|-------------|-------------------|---------|
| **Admin Pages** | `src/pages/AdminDashboard.tsx` (1300 lines, FULL) | `frontend/src/pages/admin/AdminDashboard.tsx` (STUB) | ⏳ Keep both — new one needs implementation |
| **Customer Pages** | `src/pages/CustomerDashboard.tsx` (575 lines, FULL) | `frontend/src/pages/customer/CustomerHome.tsx` (STUB) | ⏳ Keep both — new one needs implementation |
| **Business Pages** | `src/pages/ProviderDashboard.tsx` (FULL) | `frontend/src/pages/business/*` (all STUBS) | ⏳ Keep both — new ones need implementation |
| **Auth** | `src/pages/Auth.tsx` (FULL) | `frontend/src/pages/auth/Login.tsx` + `Register.tsx` (STUBS) | ⏳ Keep both — new ones need implementation |
| **API Client** | `src/lib/api.ts` (fetch-based) | `frontend/src/lib/api.ts` (Axios-based) | ✅ Different stacks, both valid |
| **Auth State** | `src/lib/AuthContext.tsx` (Context API) | `frontend/src/store/authStore.ts` (Zustand) | ✅ Different state management |
| **Components** | `src/components/` (full set: admin/, crm/, customer/, kyc/, orders/, provider/, workspace/) | `frontend/src/components/` (layouts only + some orders/) | ⏳ Keep both — new one needs porting |
| **Services** | `src/services/` (23 files — full set) | `frontend/src/services/` (7 files — partial) | ⏳ Keep both — new one needs porting |

### Category B: Flutter vs React — Parallel Implementations (Intentional)

These are **intentionally parallel** — Flutter for mobile/web, React for desktop/web.

| Feature | Flutter | React (`src/`) | Verdict |
|---------|---------|----------------|---------|
| Admin Dashboard | `screens/admin_dashboard_screen.dart` | `src/pages/AdminDashboard.tsx` | ✅ Intentional — different platforms |
| Customer Dashboard | `screens/customer_dashboard_screen.dart` | `src/pages/CustomerDashboard.tsx` | ✅ Intentional |
| Provider Dashboard | `screens/provider_dashboard_screen.dart` | `src/pages/ProviderDashboard.tsx` | ✅ Intentional |
| Auth | `screens/auth_screen.dart` | `src/pages/Auth.tsx` | ✅ Intentional |
| Order Wizard | `screens/create_order_wizard_screen.dart` | `src/components/orders/OrderWizard.tsx` | ✅ Intentional |
| KYC | `screens/kyc_screen.dart` | `src/components/kyc/` | ✅ Intentional |
| Chat | `services/chat_service.dart` | `src/services/chat.ts` | ✅ Intentional |

### Category C: Junk / Redundant Files (Candidates for Deletion)

These files appear to be **unused or redundant**:

| File | Reason | Action |
|------|--------|--------|
| `ignore/neighborhub_admin.html` | Old prototype/mock HTML | 🗑️ Delete |
| `ignore/neighborhub_prototype.html` | Old prototype/mock HTML | 🗑️ Delete |
| `index.html` (root) | Check if it's Vite entry or static mock | 🔍 Verify first |
| `metadata.json` | Unknown purpose | 🔍 Verify |
| `firebase-applet-config.json` | Firebase config — may be unused | 🔍 Verify |
| `firebase-blueprint.json` | Firebase config — may be unused | 🔍 Verify |
| `firestore.rules` | Firestore rules — may be unused | 🔍 Verify |
| `files/AGENTS.md` | Duplicate of `AGENTS.md` at root | 🗑️ Delete (keep root) |
| `files/FEATURES.md` | Should be in `docs/` | 📦 Move to `docs/` |
| `files/ROADMAP.md` | Should be in `docs/` | 📦 Move to `docs/` |
| `files/START_HERE.md` | Should be in `docs/` | 📦 Move to `docs/` |

### Category D: Backend Routes — All Unique ✅

All 35+ route files in `routes/` are unique and serve different purposes. **No duplication detected.**

---

## 📊 Summary of Running Services

```
┌─────────────────────────────────────────────────────┐
│                   Neighborly Stack                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Backend API (Main)   →  http://localhost:8077  ✅   │
│  Backend API (Admin)  →  http://localhost:9090  ✅   │
│  New Frontend (Vite)  →  http://localhost:5173  ✅   │
│  Flutter Web          →  http://localhost:7357  ✅   │
│                                                      │
│  PostgreSQL           →  Connected              ✅   │
│  Redis                →  Not available          ⚠️   │
│  NATS                 →  Not available          ⚠️   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## ⚠️ Issues Found

1. **Redis not running** — non-fatal, app works without it
2. **NATS not running** — non-fatal, app works without it
3. **Port 9090 was held by Docker container** — stopped `neighborly_web_app` container
4. **New frontend pages are mostly stubs** — only `MyOrders` and `OrderDetail` are implemented
5. **Old `src/` frontend is the only fully working UI** — it's served via Vite middleware on ports 8077/9090

## 📋 Next Steps (Awaiting Your Approval)

1. **Which files to delete?** (junk/prototype files)
2. **Which parallel implementations to keep?** (Flutter vs React)
3. **Should we clean up the `files/` directory?** (move to `docs/`)
4. **Should we remove the old `src/` frontend once new `frontend/` is complete?**
