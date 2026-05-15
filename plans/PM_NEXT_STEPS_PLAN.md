# Neighborly 2.0 — Project Manager's Execution Plan

## Current Service Status (Verified ✅)

| Service | Port | Status | PID | Details |
|---------|------|--------|-----|---------|
| Backend (Express API) | 8077 | ✅ RUNNING | 28376 | PostgreSQL connected, API responds 200 |
| Backend (Admin) | 9090 | ✅ RUNNING | 28376 | Same process, admin routes |
| Frontend (Vite/React) | 5173 | ✅ RUNNING | 26358 | Vite dev server, serves React app |
| Flutter Web | 7357 | ✅ RUNNING | 21995 | Python HTTP server serving build/web |
| Redis | 6379 | ❌ NOT AVAILABLE | — | Non-fatal, ECONNREFUSED errors in logs |

### Known Issues (Non-Blocking)
1. **Redis not running** — Backend logs show `ECONNREFUSED 127.0.0.1:6379`. This is non-fatal; Redis is used for caching/sessions but the app works without it.
2. **Frontend shows empty HTML shell** — The React app loads but may show blank page if API calls fail or auth state is missing. The HTML `<div id="root">` is present and Vite serves the JS correctly.
3. **Flutter backend connection** — Flutter app on port 7357 serves static files but needs to connect to backend on port 8077.

---

## Phase 1: Auth, KYC & Identity — Execution Plan

### Priority: HIGH — This is the foundation for all other features

### Step 1.1 — Fix Frontend Blank Page (Root Cause Analysis)

**Problem**: Frontend at port 5173 shows empty HTML. The React app loads but doesn't render content.

**Root Causes Identified**:
1. ~~`BrowserRouter` conflict with `createBrowserRouter`~~ ✅ FIXED
2. ~~API base URL pointing to port 3000 instead of 8077~~ ✅ FIXED
3. ~~Root `src/` directory interfering~~ ✅ FIXED (deleted)
4. **Remaining**: The `RequireAuth` component in [`frontend/src/app/router.tsx`](frontend/src/app/router.tsx:30) checks `useAuthStore()` for token/user. If no token exists, it redirects to `/auth/login`. The login page may have rendering issues.

**Fix**: 
- Check [`frontend/src/pages/auth/Login.tsx`](frontend/src/pages/auth/Login.tsx) for any import errors or broken JSX
- Check browser console for JS errors (CORS, missing imports, etc.)
- Ensure the auth store's `hydrate` from `persist` middleware completes before rendering

### Step 1.2 — Complete Auth Flow (Login/Register)

**Files to modify**:
- [`frontend/src/pages/auth/Login.tsx`](frontend/src/pages/auth/Login.tsx) — Ensure form submits to `POST /api/auth/login`
- [`frontend/src/pages/auth/Register.tsx`](frontend/src/pages/auth/Register.tsx) — Ensure form submits to `POST /api/auth/register`
- [`frontend/src/store/authStore.ts`](frontend/src/store/authStore.ts) — Verify `login()` and `register()` methods use correct API endpoints
- [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) — Verify Axios interceptor handles 401 refresh correctly

**Backend routes** (already exist):
- [`routes/auth.ts`](routes/auth.ts) — Login, Register, Refresh, Logout

**Test**: 
```bash
curl -X POST http://localhost:8077/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!","firstName":"Test","lastName":"User"}'
```

### Step 1.3 — Complete KYC Flow

**Files to modify**:
- [`frontend/src/services/kyc.ts`](frontend/src/services/kyc.ts) — Ensure all KYC API calls work
- Create KYC submission page if not exists
- [`routes/kyc.ts`](routes/kyc.ts) — Backend KYC routes (already exist)
- [`routes/kycUser.ts`](routes/kycUser.ts) — User-facing KYC routes (already exist)

### Step 1.4 — Security Hardening

**Critical — Access Control**:
1. **CORS Configuration** — [`server.ts`](server.ts) must restrict CORS to only:
   - `http://localhost:5173` (new frontend dev)
   - `http://localhost:7357` (Flutter dev)
   - Production domains
2. **Rate Limiting** — Add rate limiting to auth endpoints
3. **Input Validation** — Ensure all auth inputs are validated server-side
4. **HTTPS in Production** — Use Traefik/nginx as reverse proxy with TLS

---

## Phase 2: Social Feed (Public & Personal)

### Step 2.1 — Fix Feed API

**Problem**: `GET /api/posts` may fail because old `Post` table was dropped and new one is empty.

**Fix**: 
- Seed some test posts or ensure the feed route handles empty results gracefully
- Check [`routes/posts.ts`](routes/posts.ts) and [`routes/feed.ts`](routes/feed.ts) for schema compatibility

### Step 2.2 — Complete Feed UI

**Files**:
- [`frontend/src/pages/public/Feed.tsx`](frontend/src/pages/public/Feed.tsx) — Main feed page
- [`frontend/src/pages/public/Explore.tsx`](frontend/src/pages/public/Explore.tsx) — Explore page
- [`frontend/src/pages/public/ServiceDetail.tsx`](frontend/src/pages/public/ServiceDetail.tsx) — Service detail page

---

## Phase 3: Service Catalog & Booking Engine

### Step 3.1 — Service Catalog API
- [`routes/serviceCatalog.ts`](routes/serviceCatalog.ts) — Already exists
- [`routes/services.ts`](routes/services.ts) — Already exists

### Step 3.2 — Booking UI
- Create booking wizard components
- Connect to order creation API

---

## Phase 4: Order Lifecycle

### Step 4.1 — Order API
- [`routes/orders.ts`](routes/orders.ts) — Already exists
- [`routes/orderChat.ts`](routes/orderChat.ts) — Already exists
- [`routes/orderContracts.ts`](routes/orderContracts.ts) — Already exists
- [`routes/orderPayments.ts`](routes/orderPayments.ts) — Already exists

### Step 4.2 — Order UI
- [`frontend/src/pages/customer/MyOrders.tsx`](frontend/src/pages/customer/MyOrders.tsx) — Already exists
- [`frontend/src/pages/customer/OrderDetail.tsx`](frontend/src/pages/customer/OrderDetail.tsx) — Already exists
- [`frontend/src/pages/customer/Messages.tsx`](frontend/src/pages/customer/Messages.tsx) — Already exists

---

## Infrastructure & Security Checklist

### Must Fix Before Production

- [ ] **CORS Restriction** — Update [`server.ts`](server.ts) to whitelist only specific origins
- [ ] **Redis Setup** — Install and configure Redis for session management
- [ ] **Environment Variables** — Move all secrets to `.env` (DB URL, JWT secret, API keys)
- [ ] **Rate Limiting** — Add `express-rate-limit` to auth routes
- [ ] **Input Sanitization** — Add Helmet.js and input validation middleware
- [ ] **HTTPS** — Configure Traefik/nginx reverse proxy with TLS certs
- [ ] **Database Backups** — Configure automated PostgreSQL backups
- [ ] **Monitoring** — Add health check endpoints and logging

### Nice-to-Have

- [ ] **Docker Compose** — Single command to start all services
- [ ] **CI/CD Pipeline** — GitHub Actions for automated testing and deployment
- [ ] **Swagger/OpenAPI** — API documentation

---

## Service Startup Commands (For Reference)

```bash
# Terminal 1: Backend (port 8077 + 9090)
cd /home/amir/ver3/Merge-main/Merge-main && npm run dev

# Terminal 2: Frontend (port 5173)
cd /home/amir/ver3/Merge-main/Merge-main/frontend && npm run dev

# Terminal 3: Flutter (port 7357)
cd /home/amir/ver3/Merge-main/Merge-main/flutter_project/build/web && python3 -m http.server 7357

# Terminal 4: Redis (optional)
redis-server
```

---

## Architecture Decision Records

### ADR-001: Frontend-Backend Communication
**Decision**: Frontend (port 5173) communicates with Backend (port 8077) via REST API.
**Reason**: Separation of concerns. Backend is API-only in dev mode (Vite middleware removed).
**Security**: CORS must be configured to only allow specific origins.

### ADR-002: Flutter-Backend Communication
**Decision**: Flutter (port 7357) communicates with Backend (port 8077) via REST API.
**Reason**: Flutter is a separate client, not a mirror of the React frontend.
**Note**: Flutter's API base URL must be configured to point to `http://localhost:8077/api`.

### ADR-003: No More Root `src/` Directory
**Decision**: The root `src/` directory (old UI) has been deleted.
**Reason**: It conflicted with the new `frontend/src/` directory and caused Vite to serve wrong files.
**Impact**: The backend no longer serves SPA in dev mode. Frontend runs independently on port 5173.

---

## Testing Protocol

After each phase, run:
```bash
# 1. Check all ports
curl -s -o /dev/null -w "%{http_code}" http://localhost:8077/api/system/config
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
curl -s -o /dev/null -w "%{http_code}" http://localhost:7357

# 2. Test auth flow
curl -X POST http://localhost:8077/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test1234!"}'

# 3. Test protected routes (with token)
curl -H "Authorization: Bearer <token>" http://localhost:8077/api/posts

# 4. Check backend logs for errors
tail -50 /tmp/backend.log | grep -v "Redis error"
```
