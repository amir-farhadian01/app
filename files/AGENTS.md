# Neighborly 2.0 — Agent Instructions (AGENTS.md)

**Version:** 2.0.0  
**Last Updated:** 2026-05-09  

> READ THIS FILE COMPLETELY BEFORE WRITING ANY CODE.
> Then read ROADMAP.md. Then read FEATURES.md.
> Only then start working.

---

## 0. Prime Directives

1. **English only** in all code, comments, logs, commit messages, and documentation.
2. **Never delete database columns** — use `archivedAt` (soft delete).
3. **All code must have tests** — unit coverage ≥70% for new code.
4. **SonarCloud must pass** — 0 blockers, 0 critical issues before merge.
5. **Check ROADMAP.md first** — if a feature is marked ✅ Done, do not rewrite it. Build on it.
6. **Update ROADMAP.md** when you complete a phase or discover drift.

---

## 1. CLEANUP AGENT — First Task

**Before any feature work, this agent runs cleanup.**

### Files and Directories to DELETE

```bash
# Backup/version folders — completely remove
rm -rf repoversion2/
rm -rf temp_version2/
rm -rf scratch/

# Root-level screenshot PNGs (not needed in repo)
rm -f admin_audit.png
rm -f admin_users.png
rm -f admin_users_direct.png
rm -f admin_users_success.png
rm -f flutter_audit.png
rm -f flutter_audit_v2.png
rm -f flutter_auth.png
rm -f login_debug.png
rm -f login_mobile.png
rm -f react_audit.png
rm -f react_auth_desktop.png

# PID files (should not be in git)
rm -f .backend.pid
rm -f .flutter.pid

# Legacy sync scripts
rm -f sync-from-version2.sh

# Old index.html (if it's a stale leftover, not the Vite entry)
# CHECK FIRST: if index.html is the Vite app entry, keep it
# If it's the old static HTML mock, delete it
cat index.html | head -5  # inspect before deleting
```

### Files to REVIEW and potentially delete/replace
- `provider-ui-mock.html` — likely a design mock, delete after frontend scaffold
- `run-project.sh` — update to match new structure or delete

### Files to UPDATE
- `README.md` — rewrite to reflect Neighborly 2.0 vision
- `CLAUDE.md` — update with new agent instructions (point to this file)
- `.gitignore` — add `*.pid`, `*.png` screenshots, coverage artifacts
- `docker-compose.yml` — add frontend service when scaffold is ready

### Old docs/ folder
Replace the contents of `docs/` with the three new files from this prompt:
- `docs/ROADMAP.md` ← new master roadmap
- `docs/FEATURES.md` ← dashboard features
- `docs/AGENTS.md` ← this file
- Keep existing: `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md` (append to them, don't delete)
- Delete any old `docs/ROADMAP.md` or `docs/AGENTS.md` after replacing

---

## 2. FRONTEND AGENT — React Frontend Bootstrap

**Goal:** Scaffold the new React frontend that will replace the old `src/` React code.

### Stack Decision
```
Framework:     React 18 + TypeScript
Bundler:       Vite
Styling:       TailwindCSS + shadcn/ui
State:         Zustand
Routing:       React Router v6
API client:    Axios + React Query (TanStack Query)
Forms:         React Hook Form + Zod
Charts:        Recharts
Icons:         Lucide React
Testing:       Vitest + Testing Library
```

### Scaffold Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx        ← all routes defined here
│   │   └── providers.tsx     ← QueryClient, Auth, Theme
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Feed.tsx
│   │   │   ├── Explore.tsx
│   │   │   └── ServiceDetail.tsx
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── customer/
│   │   │   ├── CustomerHome.tsx
│   │   │   ├── MyOrders.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   └── Profile.tsx
│   │   ├── business/
│   │   │   ├── BusinessDashboard.tsx
│   │   │   ├── Inbox.tsx
│   │   │   ├── Schedule.tsx
│   │   │   ├── Clients.tsx
│   │   │   ├── Finance.tsx
│   │   │   └── Social.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── Users.tsx
│   │       ├── KYC.tsx
│   │       ├── Orders.tsx
│   │       ├── Contracts.tsx
│   │       ├── Payments.tsx
│   │       ├── Media.tsx
│   │       └── Analytics.tsx
│   ├── components/
│   │   ├── ui/               ← shadcn components
│   │   ├── layout/
│   │   │   ├── PublicLayout.tsx
│   │   │   ├── CustomerLayout.tsx
│   │   │   ├── BusinessLayout.tsx
│   │   │   └── AdminLayout.tsx
│   │   ├── social/
│   │   │   ├── FeedCard.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── PostForm.tsx
│   │   ├── orders/
│   │   │   ├── OrderWizard.tsx
│   │   │   └── OrderCard.tsx
│   │   ├── business/
│   │   │   ├── InboxDrawer.tsx
│   │   │   └── InvoiceForm.tsx
│   │   └── admin/
│   │       ├── KycReviewDrawer.tsx
│   │       ├── FormBuilder.tsx
│   │       └── MediaAuditTable.tsx
│   ├── services/             ← API calls (one file per domain)
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   ├── services.ts
│   │   ├── chat.ts
│   │   ├── kyc.ts
│   │   └── admin/
│   │       ├── adminUsers.ts
│   │       ├── adminOrders.ts
│   │       ├── adminKyc.ts
│   │       └── adminMedia.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useLocationFilter.ts
│   └── lib/
│       ├── api.ts            ← Axios instance with auth interceptor
│       └── utils.ts
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Routing Map
```
/                        → PublicFeed (no auth required)
/explore                 → Explore (no auth)
/services/:id            → ServiceDetail (no auth)
/auth/login              → Login
/auth/register           → Register

/app/home                → CustomerHome (auth: CUSTOMER)
/app/orders              → MyOrders
/app/orders/:id          → OrderDetail
/app/orders/new          → OrderWizard
/app/profile             → Profile
/app/kyc                 → KycFlow

/business/:workspaceId           → BusinessDashboard (auth: PROVIDER/OWNER/EMPLOYEE)
/business/:workspaceId/inbox     → Inbox
/business/:workspaceId/schedule  → Schedule
/business/:workspaceId/clients   → Clients
/business/:workspaceId/finance   → Finance
/business/:workspaceId/social    → Social

/admin                   → AdminDashboard (auth: ADMIN)
/admin/users             → Users
/admin/kyc               → KYC
/admin/orders            → Orders
/admin/contracts         → Contracts
/admin/payments          → Payments
/admin/media             → Media
/admin/analytics         → Analytics
```

### API Base URL
- Dev: `http://localhost:3000/api`
- Prod: from env `VITE_API_URL`

### Auth Flow
- JWT stored in httpOnly cookie (if backend supports) OR localStorage with refresh token rotation
- Axios interceptor adds `Authorization: Bearer <token>` to every request
- On 401, attempt refresh; on failure, redirect to `/auth/login`

---

## 3. BACKEND AGENT — Extend Existing Backend

**Do NOT rewrite working code. Only add.**

### New API Endpoints Needed

#### Social Feed
```
GET    /api/feed                     ← personalized feed (auth optional)
GET    /api/feed/public              ← public feed (no auth)
POST   /api/posts                    ← create post/video
GET    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/react
POST   /api/posts/:id/comment
GET    /api/posts/:id/comments
GET    /api/utility-links            ← admin-curated public links
```

#### Business CRM
```
GET    /api/workspaces/:id/clients
GET    /api/workspaces/:id/clients/:clientId
POST   /api/workspaces/:id/invoices
GET    /api/workspaces/:id/invoices
GET    /api/workspaces/:id/invoices/:invoiceId
PUT    /api/workspaces/:id/invoices/:invoiceId
POST   /api/workspaces/:id/invoices/:invoiceId/send
```

#### Admin Media
```
GET    /api/admin/media              ← all uploaded media + audit status
GET    /api/admin/media/:id
POST   /api/admin/media/:id/moderate ← approve/remove/warn
GET    /api/admin/media/stats        ← engagement metrics
```

#### Admin Utility Links
```
GET    /api/admin/utility-links
POST   /api/admin/utility-links
PUT    /api/admin/utility-links/:id
DELETE /api/admin/utility-links/:id
GET    /api/admin/utility-links/:id/clicks ← referral analytics
```

### Prisma Schema Extensions Needed

```prisma
model Post {
  id          String    @id @default(cuid())
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  type        PostType  // VIDEO | PHOTO | TEXT
  mediaUrl    String?
  thumbnailUrl String?
  caption     String?
  serviceId   String?   // links to bookable service
  businessId  String?
  location    Json?     // { lat, lng, radius, label }
  interests   String[]  // tag array
  views       Int       @default(0)
  createdAt   DateTime  @default(now())
  archivedAt  DateTime?
  reactions   PostReaction[]
  comments    PostComment[]
  mediaAsset  MediaAsset? @relation(fields: [mediaAssetId], references: [id])
  mediaAssetId String? @unique
}

enum PostType {
  VIDEO
  PHOTO
  TEXT
}

model MediaAsset {
  id              String    @id @default(cuid())
  uploaderId      String
  uploader        User      @relation(fields: [uploaderId], references: [id])
  url             String
  thumbnailUrl    String?
  mimeType        String
  sizeBytes       Int
  duration        Int?      // seconds (video)
  moderationStatus ModerationStatus @default(PENDING)
  moderationNote  String?
  moderatedById   String?
  moderatedAt     DateTime?
  views           Int       @default(0)
  flagCount       Int       @default(0)
  createdAt       DateTime  @default(now())
  archivedAt      DateTime?
  post            Post?
}

enum ModerationStatus {
  PENDING
  APPROVED
  REMOVED
  WARNED
}

model UtilityLink {
  id          String    @id @default(cuid())
  title       String
  url         String
  description String?
  category    String    // BANK | INSURANCE | FUEL | GOVERNMENT | OTHER
  logoUrl     String?
  commissionRate Float? // percentage
  clickCount  Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  archivedAt  DateTime?
  clicks      UtilityLinkClick[]
}

model UtilityLinkClick {
  id        String      @id @default(cuid())
  linkId    String
  link      UtilityLink @relation(fields: [linkId], references: [id])
  userId    String?
  clickedAt DateTime    @default(now())
  userAgent String?
}

model Invoice {
  id          String        @id @default(cuid())
  workspaceId String
  workspace   Business      @relation(fields: [workspaceId], references: [id])
  customerId  String?
  customer    User?         @relation(fields: [customerId], references: [id])
  orderId     String?
  order       Order?        @relation(fields: [orderId], references: [id])
  status      InvoiceStatus @default(DRAFT)
  lineItems   Json          // [{description, qty, unitPrice, total}]
  subtotal    Int           // cents
  tax         Int           @default(0)
  total       Int
  dueDate     DateTime?
  sentAt      DateTime?
  paidAt      DateTime?
  pdfUrl      String?
  notes       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  archivedAt  DateTime?
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}
```

---

## 4. CI/CD AGENT — Pipeline Setup

### GitHub Actions Files to Create

**`.github/workflows/ci.yml`**
```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  lint-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: neighborly_test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/neighborly_test

  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - working-directory: frontend
        run: npm ci && npm run lint && npm run typecheck

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - working-directory: frontend
        run: npm ci && npm run test -- --coverage

  sonar:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build

  deploy:
    runs-on: ubuntu-latest
    needs: [sonar, docker-build]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: echo "Add your deployment script here"
```

### SonarCloud Config — `sonar-project.properties`
```properties
sonar.projectKey=neighborly-app
sonar.organization=your-org
sonar.sources=src,frontend/src
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,prisma/migrations/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info,frontend/coverage/lcov.info
sonar.qualitygate.wait=true
```

---

## 5. TESTING STANDARDS

Every agent must write tests for new code.

### Backend (Jest)
```typescript
// Example: routes test
describe('POST /api/orders', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(401);
  });

  it('creates draft order for authenticated customer', async () => {
    const token = await loginAsCustomer();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceId: 'test-service', status: 'draft' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });
});
```

### Frontend (Vitest)
```typescript
// Example: component test
import { render, screen } from '@testing-library/react'
import { OrderCard } from './OrderCard'

describe('OrderCard', () => {
  it('displays order status badge', () => {
    render(<OrderCard order={{ id: '1', status: 'matched', service: 'Haircut' }} />)
    expect(screen.getByText('Matched')).toBeInTheDocument()
  })
})
```

### Coverage Thresholds
```json
// jest.config.js / vitest.config.ts
{
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

---

## 6. CODE STANDARDS

### TypeScript
- Strict mode ON (`"strict": true` in tsconfig)
- No `any` types — use `unknown` and narrow
- All async functions must have explicit return types
- All API responses must have typed interfaces

### React Components
- Functional components only
- Props typed with interfaces (not inline)
- No business logic in components — extract to hooks or services
- All API calls via React Query (`useQuery` / `useMutation`)

### API Design
- RESTful endpoints
- Consistent error format: `{ code: string, message: string, details?: object }`
- Pagination: `{ data: T[], total: number, page: number, pageSize: number }`
- All mutations return the updated resource

### Git
- Commit message format: `type(scope): description`
  - `feat(orders): add payment gate check`
  - `fix(kyc): handle missing document gracefully`
  - `docs(agents): update cleanup instructions`
- One logical change per commit
- PR body must reference ROADMAP.md phase

---

## 7. AGENT TASK CHECKLIST

Before opening a PR, verify:

- [ ] Read ROADMAP.md and identified the correct phase
- [ ] No existing working code was rewritten without reason
- [ ] New files are in the correct directory per structure above
- [ ] TypeScript strict mode passes (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Tests written for all new logic
- [ ] Coverage ≥70% for changed files
- [ ] ROADMAP.md updated if a phase status changed
- [ ] No Persian/Farsi text in code or comments
- [ ] No `.pid` files or screenshots committed
- [ ] Docker build succeeds locally (`docker compose build`)
