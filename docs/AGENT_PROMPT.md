# Neighborly 2.0 — Autonomous Agent Execution Prompt

> **Instructions for the AI Agent:** Execute the following phases **in order**. Do not skip ahead. Commit after each phase. Read all referenced files before making changes. Never delete database columns — use `archivedAt` for soft-delete. All code in English only.

## HOW TO USE THIS PROMPT

1. **Read the PRE-FLIGHT section** first — read all referenced files before writing any code
2. **Execute each phase sequentially** — each phase builds on the previous one
3. **Commit after each phase** — use the exact commit message provided
4. **Use existing `src/` code as reference** — the old frontend in `src/` has fully working implementations of Admin Dashboard, Customer Dashboard, Provider Dashboard, Order Wizard, KYC flow, etc. Read those files to understand the patterns and reuse logic when building the new `frontend/` pages
5. **Run quality checks before each commit** — `npm run typecheck` and `npm run lint`
6. **If stuck, check `docs/DECISIONS.md`** for prior architectural decisions
7. **Update `docs/ROADMAP.md`** status when you complete a phase

---

## PRE-FLIGHT: READ THESE FILES FIRST

Before writing any code, read these files in this exact order:
1. `files/START_HERE.md`
2. `docs/ROADMAP.md`
3. `docs/FEATURES.md`
4. `docs/AGENTS.md`
5. `prisma/schema.prisma` (existing schema)
6. `server.ts` (existing server entry point)
7. `frontend/src/app/router.tsx` (existing routes)
8. `frontend/src/lib/api.ts` (existing API client)
9. `frontend/src/store/authStore.ts` (existing auth store)
10. `frontend/package.json` (existing dependencies)

## CRITICAL: USE EXISTING src/ CODE AS REFERENCE

The old frontend in the `src/` directory contains **fully working implementations** of almost everything you need to build in the new `frontend/`. Do NOT rewrite from scratch — read and reuse patterns from these files:

| New frontend page | Reference in `src/` |
|---|---|
| Admin pages | `src/pages/AdminDashboard.tsx` — full admin with all tabs (users, KYC, orders, contracts, payments, chat moderation, service definitions, packages, inventory) |
| Customer pages | `src/pages/CustomerDashboard.tsx` — full customer dashboard with home, orders, profile, KYC |
| Business pages | `src/pages/ProviderDashboard.tsx`, `src/pages/CompanyDashboard.tsx` — provider/business dashboards |
| Order Wizard | `src/components/orders/OrderWizard.tsx` — 7-step wizard with all sub-components |
| KYC Flow | `src/components/kyc/` — personal + business KYC with document upload, camera, review |
| Admin Components | `src/components/admin/` — all admin sections with tables, drawers, filters |
| Provider Components | `src/components/provider/` — inbox, finance, inventory, packages, schedule, staff |
| API Services | `src/services/` — all API service files for every domain |
| Auth | `src/lib/AuthContext.tsx`, `src/lib/api.ts` — auth context and API client |
| CRM Table | `src/components/crm/CrmTable.tsx` — reusable table with filters, sorting, export |

**How to use the reference code:**
1. Read the relevant `src/` file to understand the component structure, API calls, and state management
2. Port the logic to the new `frontend/` structure using the new stack (Zustand + TanStack Query + shadcn/ui)
3. Do NOT copy-paste — adapt to the new architecture
4. The old `src/` uses `fetch`-based API client; the new `frontend/` uses Axios
5. The old `src/` uses inline state; the new `frontend/` uses Zustand + TanStack Query

---

## PHASE 0 — CLEANUP & BOOTSTRAP

### Step 0.1 — Delete Junk Files

Run these commands from the repository root:

```bash
# Remove backup/version folders
rm -rf repoversion2/ temp_version2/ scratch/

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
# If it's a static mock (not Vite entry), delete it
```

### Step 0.2 — Update .gitignore

Add these lines to `.gitignore` if not already present:

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

### Step 0.3 — Update docs/ Folder

Replace old documentation with the new set:
- Copy `files/ROADMAP.md` → `docs/ROADMAP.md` (replace existing)
- Copy `files/FEATURES.md` → `docs/FEATURES.md` (replace existing)
- Copy `files/AGENTS.md` → `docs/AGENTS.md` (replace existing)
- Keep existing: `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md` (do not delete)

### Step 0.4 — Update CLAUDE.md

Replace contents of `CLAUDE.md` with:

```markdown
# Neighborly 2.0 — Claude/Cursor Agent Guide

Read these files in this exact order before doing anything:
1. files/START_HERE.md
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

### Step 0.5 — Update README.md

Rewrite `README.md` with:

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
1. cp .env.example .env (fill in required values)
2. docker compose up -d (starts postgres, redis, NATS)
3. npx prisma migrate dev
4. npm run dev (starts backend on port 3000)
5. cd frontend && npm run dev (starts frontend on port 5173)

## Documentation
Read docs/ROADMAP.md first.
```

### Step 0.6 — CI/CD Pipeline

Create `.github/workflows/ci.yml`:

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

Create `sonar-project.properties`:

```properties
sonar.projectKey=neighborly-app
sonar.organization=your-org
sonar.sources=src,frontend/src
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,prisma/migrations/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info,frontend/coverage/lcov.info
sonar.qualitygate.wait=true
```

### Step 0.7 — Commit

```bash
git add -A
git commit -m "chore(cleanup): remove backup folders, stale PNGs, and legacy scripts"
```

---

## PHASE 1 — PRISMA SCHEMA EXTENSIONS

### Step 1.1 — Add New Models to schema.prisma

Open `prisma/schema.prisma` and add the following models. Do NOT delete any existing models or fields.

**Add to User model:**
```prisma
normalizedEmail String? @unique
```

**Add new models:**

```prisma
model UserAddress {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  label       String   // home | work | favourite | custom string
  street      String
  city        String
  province    String
  postalCode  String
  country     String   @default("CA")
  latitude    Float
  longitude   Float
  categoryTags String[] // interest/category tags tied to this location
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  archivedAt  DateTime?
}

model BusinessVerification {
  id                    String    @id @default(cuid())
  workspaceId           String    @unique
  requiresLicense       Boolean   @default(false)
  licenseNumber         String?
  licenseDocUrl         String?
  licenseVerifiedAt     DateTime?
  hasLiabilityInsurance Boolean   @default(false)
  insuranceDocUrl       String?
  insuranceVerifiedAt   DateTime?
  verifiedByAdminId     String?
  notes                 String?
  updatedAt             DateTime  @updatedAt
}

model BusinessTrustScore {
  id                String   @id @default(cuid())
  workspaceId       String   @unique
  kycVerified       Boolean  @default(false)
  licenseVerified   Boolean  @default(false)
  insuranceVerified Boolean  @default(false)
  avgRating         Float    @default(0)
  totalScore        Float    @default(0)
  updatedAt         DateTime @updatedAt
}

enum PostType {
  VIDEO
  PHOTO
  TEXT
}

// Replace existing Post model with this enhanced version
model Post {
  id          String    @id @default(cuid())
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  type        PostType
  mediaUrl    String?
  thumbnailUrl String?
  caption     String?
  serviceId   String?
  businessId  String?
  location    Json?
  interests   String[]
  views       Int       @default(0)
  createdAt   DateTime  @default(now())
  archivedAt  DateTime?
  reactions   PostReaction[]
  comments    PostComment[]
  mediaAsset  MediaAsset? @relation(fields: [mediaAssetId], references: [id])
  mediaAssetId String? @unique
}

model PostReaction {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // like | love | laugh | etc.
  createdAt DateTime @default(now())

  @@unique([postId, userId])
}

model PostComment {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  text      String
  createdAt DateTime @default(now())
}

enum ModerationStatus {
  PENDING
  APPROVED
  REMOVED
  WARNED
}

model MediaAsset {
  id              String    @id @default(cuid())
  uploaderId      String
  uploader        User      @relation(fields: [uploaderId], references: [id])
  url             String
  thumbnailUrl    String?
  mimeType        String
  sizeBytes       Int
  duration        Int?
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

model UtilityLink {
  id             String             @id @default(cuid())
  title          String
  url            String
  description    String?
  category       String             // BANK | INSURANCE | FUEL | GOVERNMENT | OTHER
  logoUrl        String?
  commissionRate Float?
  clickCount     Int                @default(0)
  isActive       Boolean            @default(true)
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  archivedAt     DateTime?
  clicks         UtilityLinkClick[]
}

model UtilityLinkClick {
  id        String      @id @default(cuid())
  linkId    String
  link      UtilityLink @relation(fields: [linkId], references: [id])
  userId    String?
  clickedAt DateTime    @default(now())
  userAgent String?
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}

model Invoice {
  id          String        @id @default(cuid())
  workspaceId String
  workspace   Company       @relation(fields: [workspaceId], references: [id])
  customerId  String?
  customer    User?         @relation(fields: [customerId], references: [id])
  orderId     String?
  order       Order?        @relation(fields: [orderId], references: [id])
  status      InvoiceStatus @default(DRAFT)
  lineItems   Json
  subtotal    Int
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

model WorkspaceSocialRole {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  grantedById String
  createdAt   DateTime @default(now())
  archivedAt  DateTime?
}
```

### Step 1.2 — Run Migration

```bash
npx prisma migrate dev --name "add_neighborly_v2_models"
npx prisma generate
```

### Step 1.3 — Commit

```bash
git add -A
git commit -m "feat(prisma): add v2 models - addresses, trust scores, posts, media, invoices, utility links"
```

---

## PHASE 2 — NEW BACKEND ENDPOINTS

### Step 2.1 — Create Feed Routes

Create `routes/feed.ts`:

```typescript
import { Router } from 'express';
import { authenticate, optionalAuth } from '../lib/auth.middleware.js';
import prisma from '../lib/db.js';

const router = Router();

// GET /api/feed — personalized feed (auth optional)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const where: any = { archivedAt: null };
    
    // If user is authenticated, filter by interests/location
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { location: true, gender: true },
      });
      if (user?.location) {
        // Add location-based filtering
      }
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          reactions: true,
          comments: { take: 3, orderBy: { createdAt: 'desc' } },
          _count: { select: { reactions: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ data: posts, total, page, pageSize });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// GET /api/feed/public — public feed (no auth)
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { archivedAt: null },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: { select: { reactions: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where: { archivedAt: null } }),
    ]);

    res.json({ data: posts, total, page, pageSize });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public feed' });
  }
});

export default router;
```

### Step 2.2 — Enhance Posts Routes

Update `routes/posts.ts` to add:
- `POST /api/posts` — create post with type, media, caption, location, interests
- `GET /api/posts/:id` — get single post with reactions and comments
- `DELETE /api/posts/:id` — soft-delete post
- `POST /api/posts/:id/react` — toggle reaction
- `POST /api/posts/:id/comment` — add comment
- `GET /api/posts/:id/comments` — get paginated comments

### Step 2.3 — Create Utility Links Route

Create `routes/utilityLinks.ts`:

```typescript
import { Router } from 'express';
import prisma from '../lib/db.js';

const router = Router();

// GET /api/utility-links — public endpoint for admin-curated links
router.get('/', async (req, res) => {
  try {
    const category = req.query.category as string;
    const where: any = { isActive: true, archivedAt: null };
    if (category) where.category = category;

    const links = await prisma.utilityLink.findMany({
      where,
      orderBy: { title: 'asc' },
    });

    res.json({ data: links });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch utility links' });
  }
});

// POST /api/utility-links/:id/click — track click
router.post('/:id/click', async (req, res) => {
  try {
    const link = await prisma.utilityLink.update({
      where: { id: req.params.id },
      data: { clickCount: { increment: 1 } },
    });

    await prisma.utilityLinkClick.create({
      data: {
        linkId: req.params.id,
        userId: (req as any).user?.id,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track click' });
  }
});

export default router;
```

### Step 2.4 — Create Business CRM Endpoints

Update `routes/workspaces.ts` to add:
- `GET /api/workspaces/:id/clients` — list clients who have ordered from this workspace
- `GET /api/workspaces/:id/clients/:clientId` — client detail with order history
- `POST /api/workspaces/:id/invoices` — create invoice
- `GET /api/workspaces/:id/invoices` — list invoices
- `GET /api/workspaces/:id/invoices/:invoiceId` — get invoice detail
- `PUT /api/workspaces/:id/invoices/:invoiceId` — update invoice
- `POST /api/workspaces/:id/invoices/:invoiceId/send` — mark invoice as sent

### Step 2.5 — Create Admin Media Routes

Create `routes/adminMedia.ts`:

```typescript
import { Router } from 'express';
import { authenticate, requireRole } from '../lib/auth.middleware.js';
import prisma from '../lib/db.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('platform_admin'));

// GET /api/admin/media — all uploaded media with audit status
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string;
    const uploaderType = req.query.uploaderType as string;

    const where: any = { archivedAt: null };
    if (status) where.moderationStatus = status;

    const [media, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        include: {
          uploader: { select: { id: true, displayName: true, email: true } },
          post: { select: { id: true, caption: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    res.json({ data: media, total, page, pageSize });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// GET /api/admin/media/stats — engagement metrics
router.get('/stats', async (req, res) => {
  try {
    const [totalMedia, pendingReview, flaggedContent, totalViews] = await Promise.all([
      prisma.mediaAsset.count({ where: { archivedAt: null } }),
      prisma.mediaAsset.count({ where: { moderationStatus: 'PENDING', archivedAt: null } }),
      prisma.mediaAsset.count({ where: { flagCount: { gt: 0 }, archivedAt: null } }),
      prisma.mediaAsset.aggregate({ _sum: { views: true } }),
    ]);

    res.json({
      totalMedia,
      pendingReview,
      flaggedContent,
      totalViews: totalViews._sum.views || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media stats' });
  }
});

// POST /api/admin/media/:id/moderate — approve/remove/warn
router.post('/:id/moderate', async (req, res) => {
  try {
    const { action, note } = req.body; // action: APPROVED | REMOVED | WARNED
    const media = await prisma.mediaAsset.update({
      where: { id: req.params.id },
      data: {
        moderationStatus: action,
        moderationNote: note,
        moderatedById: (req as any).user.id,
        moderatedAt: new Date(),
      },
    });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: 'Failed to moderate media' });
  }
});

export default router;
```

### Step 2.6 — Create Admin Utility Links Routes

Create `routes/adminUtilityLinks.ts`:

```typescript
import { Router } from 'express';
import { authenticate, requireRole } from '../lib/auth.middleware.js';
import prisma from '../lib/db.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('platform_admin'));

// CRUD for utility links
router.get('/', async (req, res) => {
  try {
    const links = await prisma.utilityLink.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { clicks: true } } },
    });
    res.json({ data: links });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch utility links' });
  }
});

router.post('/', async (req, res) => {
  try {
    const link = await prisma.utilityLink.create({ data: req.body });
    res.status(201).json(link);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create utility link' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const link = await prisma.utilityLink.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update utility link' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.utilityLink.update({
      where: { id: req.params.id },
      data: { archivedAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive utility link' });
  }
});

// GET /api/admin/utility-links/:id/clicks — referral analytics
router.get('/:id/clicks', async (req, res) => {
  try {
    const clicks = await prisma.utilityLinkClick.findMany({
      where: { linkId: req.params.id },
      orderBy: { clickedAt: 'desc' },
      take: 100,
    });
    res.json({ data: clicks, total: clicks.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clicks' });
  }
});

export default router;
```

### Step 2.7 — Mount New Routes in server.ts

Add these imports and mount calls to `server.ts`:

```typescript
import feedRoutes from './routes/feed.js';
import utilityLinksRoutes from './routes/utilityLinks.js';
import adminMediaRoutes from './routes/adminMedia.js';
import adminUtilityLinksRoutes from './routes/adminUtilityLinks.js';

// In mountApiRoutes:
app.use('/api/feed', feedRoutes);
app.use('/api/utility-links', utilityLinksRoutes);
app.use('/api/admin/media', adminMediaRoutes);
app.use('/api/admin/utility-links', adminUtilityLinksRoutes);
```

### Step 2.8 — Commit

```bash
git add -A
git commit -m "feat(api): add feed, utility links, admin media, and business CRM endpoints"
```

---

## PHASE 3 — FRONTEND: AUTH & LAYOUT COMPLETION

### Step 3.1 — Complete API Client

Update `frontend/src/lib/api.ts` to be a proper Axios instance:

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        useAuthStore.getState().setToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Step 3.2 — Complete Auth Store

Update `frontend/src/store/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  roles: string[];
  avatarUrl: string | null;
  phone: string | null;
  isVerified: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  displayName?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,

      setToken: (token: string) => set({ token }),

      setUser: (user: User) => set({ user }),

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ token: data.accessToken, user: data.user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (registerData: RegisterData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', registerData);
          set({ token: data.accessToken, user: data.user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ token: null, user: null });
        localStorage.removeItem('accessToken');
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
        } catch {
          // Silent fail — user might not be authenticated
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
```

### Step 3.3 — Complete UI Store

Update `frontend/src/store/uiStore.ts`:

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  read: boolean;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  notifications: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setTheme: (theme) => set({ theme }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
```

### Step 3.4 — Complete Providers

Update `frontend/src/app/providers.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### Step 3.5 — Complete Layout Components

Implement each layout component with proper navigation:

**PublicLayout.tsx** — Header with logo + auth buttons, main content, footer
**CustomerLayout.tsx** — Bottom nav (HOME, EXPLORER, SERVICES), profile avatar in header
**BusinessLayout.tsx** — Company logo top-left, hamburger menu, bottom nav (DASHBOARD, MY BUSINESS, MESSAGES)
**AdminLayout.tsx** — Sidebar nav with all admin sections, top bar with user info

### Step 3.6 — Commit

```bash
git add -A
git commit -m "feat(frontend): complete auth, layout, and provider infrastructure"
```

---

## PHASE 4 — FRONTEND: PUBLIC PAGES

### Step 4.1 — Feed.tsx

Implement the public feed page with:
- Stories row at top (horizontal scrollable circular avatars)
- Post feed below with cards showing: author info, media, caption, reactions, comments
- Category filter chips
- Infinite scroll or pagination
- FAB button for creating new post

### Step 4.2 — Explore.tsx

Implement the explore/discovery page with:
- Two sub-tabs: General and Business
- Stories row at top
- Post feed with search bar
- Category, distance, rating filters

### Step 4.3 — ServiceDetail.tsx

Implement service detail page with:
- Service name, description, price
- Provider info and trust score
- Booking CTA button
- Reviews section

### Step 4.4 — Login.tsx & Register.tsx

Complete auth pages with:
- Email/password form with validation (react-hook-form + zod)
- Google OAuth button
- Links to forgot password / register
- Registration with first name, last name, email, phone, password

### Step 4.5 — Commit

```bash
git add -A
git commit -m "feat(frontend): implement public pages - feed, explore, service detail, auth"
```

---

## PHASE 5 — FRONTEND: CUSTOMER DASHBOARD

### Step 5.1 — CustomerHome.tsx

Implement customer home with:
- Neighbourhood banner (weather, traffic alerts, safety alerts)
- Utility icons row (horizontal scrollable)
- Search box (prominent, 20%+ screen height)
- Local news & events feed
- Sub-tabs: HOME, MY POSTS, PROFILE (via avatar)

### Step 5.2 — MyOrders.tsx

Implement orders page with:
- Active Orders list with status badges
- Completed Jobs history table
- Filters: date range, provider, service type
- Cancel button for cancellable orders

### Step 5.3 — OrderDetail.tsx

Implement order detail with three tabs:
- Details: order info, service, provider, amount, status timeline
- Contract: contract viewer with accept/reject actions
- Chat: full chat thread with PII guard

### Step 5.4 — Messages.tsx

Implement chat hub with:
- Conversation list (left panel)
- Chat thread (right panel)
- Tabs: Active, Offers, History
- Contract generation flow ("I have reached an agreement" button)
- File attachment support

### Step 5.5 — Profile.tsx

Implement profile page with:
- Profile photo, name, email, phone
- Edit profile fields
- KYC status indicator
- Saved locations management
- "Register My Business" CTA button
- Settings (notifications, language, privacy)
- Logout

### Step 5.6 — Social Components

Create social components:
- `FeedCard.tsx` — Post card with author, media, reactions, comments, action bar
- `VideoPlayer.tsx` — Video playback with auto-play mute
- `PostForm.tsx` — Post creation form with category selector, media upload, caption

### Step 5.7 — Order Components

Create order components:
- `OrderWizard.tsx` — Multi-step wizard (service picker → when → where → details → review → submit)
- `OrderCard.tsx` — Order summary card with status badge, provider info, amount
- `OrderStatusBadge.tsx` — Color-coded status badge
- `ContractPanel.tsx` — Contract viewer with markdown rendering
- `OrderChatPanel.tsx` — Chat panel within order detail
- `NextStepBanner.tsx` — Action-oriented banner showing next step

### Step 5.8 — Commit

```bash
git add -A
git commit -m "feat(frontend): implement customer dashboard pages and components"
```

---

## PHASE 6 — FRONTEND: BUSINESS DASHBOARD

### Step 6.1 — BusinessDashboard.tsx

Implement business dashboard with:
- Stats cards: Active Services, Pending, Completed, Revenue Received, Platform Commission
- Performance cards: Best-selling service, Lowest-performing, Successful orders, Lost orders
- AI Insights Panel: analysis of lost orders, competitor comparison, suggestions
- Filter controls: date range, service type, package type

### Step 6.2 — Inbox.tsx

Implement business inbox with:
- Active tab (default): incoming offers requiring response
  - Each offer card: customer info, service, proposed date/time, initial message
  - Actions: Accept, Decline, Counter-offer, Open Chat
  - Expiry countdown per offer
- History tab: lost deals and accepted deals
- Completed Orders table: client, package, staff, amount, commission, payment ref, date, actions

### Step 6.3 — Schedule.tsx

Implement schedule/calendar view with:
- Calendar grid showing scheduled jobs
- Each job: time, client name, service, status
- Click to view job details
- Filter by staff member

### Step 6.4 — Clients.tsx

Implement client CRM with:
- Client list with contact info, order history
- Search and filter
- Client detail view with past orders, invoices, notes

### Step 6.5 — Finance.tsx

Implement finance page with:
- Tab 1 — Transactions Table: date, service, client, staff, amount, commission, net, status
  - Running total row pinned at top
  - Filters: date range, service, package, client, staff
  - Actions: Print Invoice, Email Invoice
- Tab 2 — Payment Gateway Setup:
  - Preparation checklist (documents on file)
  - Connect to Stripe button (OAuth flow)
  - Alternative payment methods: PayPal, Interac, Square

### Step 6.6 — Social.tsx

Implement social media manager with:
- Posts tab: published posts list, edit caption, archive, schedule
- Stories tab: active vs expired stories, create new story
- Comments tab: comment notifications, reply inline
- Access control: only SOCIAL_MEDIA_MANAGER role can access

### Step 6.7 — Business Components

Create business components:
- `InboxDrawer.tsx` — Offer detail drawer with accept/decline/counter
- `InvoiceForm.tsx` — Invoice creation form with line items

### Step 6.8 — Commit

```bash
git add -A
git commit -m "feat(frontend): implement business dashboard pages and components"
```

---

## PHASE 7 — FRONTEND: ADMIN PANEL

### Step 7.1 — AdminDashboard.tsx

Implement admin dashboard with:
- Overview stats cards (total users, pending KYC, active orders, revenue)
- Recent audit log feed
- Quick action buttons
- Charts: orders trend, revenue trend, user growth

### Step 7.2 — Users.tsx

Implement admin users page with:
- User CRM table with columns: name, email, role, status, KYC status, created date
- Filters: role, status, KYC status, date range, search
- User detail drawer with: personal info, orders, KYC submissions, activity log
- Bulk actions: suspend, verify, change role

### Step 7.3 — KYC.tsx

Implement admin KYC review page with:
- Queue of pending KYC submissions
- Submission detail drawer with:
  - Document viewer (ID front/back, selfie)
  - AI verdict card
  - Review action bar (approve, reject, request resubmit)
- Filters: submission type, status, date range

### Step 7.4 — Orders.tsx

Implement admin orders management with:
- Orders table with all columns
- Filters: status, service, provider, customer, date range
- Order detail drawer with full order info
- Admin override actions

### Step 7.5 — Contracts.tsx

Implement admin contract review with:
- Contract queue table
- Contract detail drawer with version history
- Review actions: approve, reject, add internal note

### Step 7.6 — Payments.tsx

Implement admin payments ledger with:
- Transactions table
- Stripe Connect overview (connected workspaces, commission received)
- Manual commission entry for non-Stripe methods

### Step 7.7 — Media.tsx

Implement admin media audit with:
- Media assets table: thumbnail, uploader, type, size, views, flags, moderation status
- Filters: uploader type, category, date, flag count
- Actions per asset: approve, remove, warn user
- Bulk moderation for flagged content
- Stats summary: total media, pending review, flagged content, total views

### Step 7.8 — Analytics.tsx

Implement admin analytics dashboard with:
- Charts: user growth, order volume, revenue, KYC completion rate
- Filters: date range
- Export to CSV

### Step 7.9 — Admin Components

Create admin components:
- `KycReviewDrawer.tsx` — KYC submission review with document viewer
- `FormBuilder.tsx` — Drag-and-drop form builder for KYC schemas
- `MediaAuditTable.tsx` — Media assets table with moderation controls

### Step 7.10 — Update Router

Update `frontend/src/app/router.tsx` to add admin sub-routes:

```typescript
{
  path: '/admin',
  element: <RequireAuth roles={['ADMIN']}><AdminLayout /></RequireAuth>,
  children: [
    { index: true, element: <AdminDashboard /> },
    { path: 'users', element: <Users /> },
    { path: 'kyc', element: <KYC /> },
    { path: 'orders', element: <Orders /> },
    { path: 'contracts', element: <Contracts /> },
    { path: 'payments', element: <Payments /> },
    { path: 'media', element: <Media /> },
    { path: 'analytics', element: <Analytics /> },
  ],
}
```

### Step 7.11 — Commit

```bash
git add -A
git commit -m "feat(frontend): implement admin panel pages and components"
```

---

## PHASE 8 — FRONTEND: SERVICE LAYER

### Step 8.1 — Create Service Files

Create all API service files in `frontend/src/services/`:

**auth.ts** — Login, register, refresh, logout, Google OAuth, forgot/reset password
**orders.ts** — Order CRUD, wizard steps, submit, cancel, review
**services.ts** — Service catalog listing, search, categories
**chat.ts** — Chat messages, threads, send message, mark read
**kyc.ts** — KYC submissions, status check, document upload

**admin/adminUsers.ts** — List users, get user detail, update user, suspend
**admin/adminOrders.ts** — List orders, get order detail, admin override
**admin/adminKyc.ts** — List submissions, get submission detail, review action
**admin/adminMedia.ts** — List media, get media detail, moderate, get stats

### Step 8.2 — Commit

```bash
git add -A
git commit -m "feat(frontend): add API service layer for all domains"
```

---

## PHASE 9 — PAYMENT GATEWAY INTEGRATION

### Step 9.1 — Stripe Connect Setup

1. Add Stripe SDK to backend: `npm install stripe`
2. Create `routes/stripe.ts` with:
   - `POST /api/stripe/connect` — Initiate Stripe Connect OAuth
   - `GET /api/stripe/connect/callback` — OAuth callback handler
   - `POST /api/stripe/create-payment-session` — Create payment intent
   - `POST /api/stripe/webhook` — Stripe webhook handler
3. Create `lib/stripe.ts` with shared Stripe instance and helpers

### Step 9.2 — Payment Flow Integration

1. Update `routes/orderPayments.ts` to integrate with Stripe
2. Add payment status tracking in Order model
3. Implement escrow: hold payment on contract approval, release on completion
4. Implement commission auto-split

### Step 9.3 — Alternative Payment Methods

Create adapter pattern for:
- PayPal Business (PayPal Commerce Platform)
- Interac e-Transfer (manual reconciliation)
- Square (Square Connect API)

### Step 9.4 — Frontend Payment Components

Create payment UI:
- Payment method selection in order flow
- Stripe Connect setup page in business finance
- Payment status display in order detail

### Step 9.5 — Commit

```bash
git add -A
git commit -m "feat(payments): add Stripe Connect integration and payment flow"
```

---

## PHASE 10 — TESTING & QUALITY

### Step 10.1 — Backend Tests

Write Jest tests for all new endpoints:
- `routes/feed.test.ts` — Feed endpoints
- `routes/posts.test.ts` — Post CRUD, reactions, comments
- `routes/utilityLinks.test.ts` — Utility link endpoints
- `routes/adminMedia.test.ts` — Admin media endpoints
- `routes/adminUtilityLinks.test.ts` — Admin utility link endpoints
- `routes/workspaces.test.ts` — Business CRM endpoints

Each test file must cover:
- Unauthenticated request (returns 401)
- Invalid input (returns 400)
- Happy path (returns 200/201)

### Step 10.2 — Frontend Tests

Write Vitest tests for:
- Auth store
- API client interceptors
- Layout components
- Key page components (Login, Feed, OrderDetail)
- Service functions

### Step 10.3 — TypeScript & ESLint

```bash
# Fix all TypeScript errors
npm run typecheck
cd frontend && npm run typecheck

# Fix all ESLint errors
npm run lint
cd frontend && npm run lint
```

### Step 10.4 — Coverage Check

Ensure coverage ≥70% for all new code:
```bash
npm test -- --coverage
cd frontend && npm test -- --coverage
```

### Step 10.5 — Docker Build

```bash
docker compose build
```

### Step 10.6 — Update ROADMAP.md

Update `docs/ROADMAP.md` status column for all completed phases.

### Step 10.7 — Final Commit

```bash
git add -A
git commit -m "test: add tests, fix quality gates, and update roadmap"
```

---

## APPENDIX: KEY REFERENCES

### File Locations

| File | Purpose |
|------|---------|
| `files/START_HERE.md` | Agent onboarding instructions |
| `files/AGENTS.md` | Detailed agent instructions |
| `files/FEATURES.md` | UI/UX feature specifications |
| `files/ROADMAP.md` | Master roadmap with phase status |
| `docs/ARCHITECTURE.md` | System architecture overview |
| `docs/DECISIONS.md` | Architectural decision records |
| `docs/GLOSSARY.md` | Domain terminology |
| `prisma/schema.prisma` | Database schema |
| `server.ts` | Backend entry point |
| `frontend/src/app/router.tsx` | Frontend route definitions |
| `frontend/src/lib/api.ts` | API client configuration |
| `frontend/src/store/authStore.ts` | Auth state management |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Cache | Redis |
| Message bus | NATS |
| Frontend | React 18 + Vite + TailwindCSS + shadcn/ui |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Payments | Stripe Connect (primary), PayPal, Interac, Square |
| Auth | JWT + refresh token rotation |
| Mobile | Flutter |
| CI/CD | GitHub Actions + SonarCloud |
| Containerization | Docker + Docker Compose |
| Reverse proxy | Traefik |

### Code Standards

1. TypeScript strict mode ON — no `any` types
2. All async functions must have explicit return types
3. No business logic in React components — use hooks and services
4. All API calls via TanStack Query (`useQuery` / `useMutation`)
5. RESTful endpoints with consistent error format
6. Pagination: `{ data: T[], total: number, page: number, pageSize: number }`
7. Commit format: `type(scope): description`
8. Never delete DB columns — use `archivedAt` for soft-delete
9. All monetary values stored as integers (cents)
10. All timestamps in UTC