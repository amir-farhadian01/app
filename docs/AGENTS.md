# Neighborly Project Rules & Guidelines

## Core Logic & Security
- **KYC Enforcement**: 
    - Users MUST complete Personal KYC (Level 1) before becoming a Provider or accessing the Provider Dashboard.
    - Providers MUST complete Business KYC before accessing core business features (services, team, finance).
    - If a user attempts to access these areas without verification, they must be redirected to the Profile/KYC page.
- **Role-Based Access Control (RBAC)**:
    - Roles: `owner`, `platform_admin`, `support`, `finance`, `provider`, `customer`.
    - Only `owner` and `platform_admin` have full access to the Admin Dashboard.
    - `amirfarhadian569@gmail.com` is the hardcoded Platform Owner.

## Error Handling & Debugging
- **API and database errors**: Route handlers use `try`/`catch`, return appropriate HTTP status codes, and log server-side; protected routes use `authenticate` (and `isAdmin` / `requireRole` for admin) from `lib/auth.middleware.ts` as registered in each route file.
- **Session Errors**: The application uses an `ErrorBoundary` and a boot-time `fetchRole` check. If these fail, a clear error message with a "Try Again" button must be shown.
- **Logging**: Critical actions and errors should be persisted via the Prisma `AuditLog` model (and related admin APIs) for admin review.

## UI/UX Standards
- **Theme**: Support both Light and Dark modes using `ThemeContext`.
- **Animations**: Use `motion` (framer-motion) for transitions and modals.
- **Icons**: Use `lucide-react`.
- **Responsive**: Mobile-first design with Tailwind CSS.

## Admin Dashboard
- **Monitoring**: Admins must be able to see system logs and application errors to diagnose session issues.
- **KYC Management**: Admins review, approve, or reject KYC submissions with clear reasonings.

# Neighborly — Rules for AI Code Generation

This file contains hard rules that MUST be followed for every code change.
Violating these rules will break the CI/CD pipeline.

---

## 1. Prisma — CRITICAL

**Keep Prisma at version 5.x. Do NOT upgrade to Prisma 6 or 7.**

The correct `schema.prisma` datasource format is:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Do NOT change this to `prisma.config.ts` or any Prisma 7 format.
Do NOT run `npx prisma migrate` — only the developer does migrations.
If you add a new model or field, only edit `prisma/schema.prisma` and explain what changed.

---

## 2. TypeScript — CRITICAL

Every file must compile without errors. Run mentally:
```bash
npx tsc --noEmit
```

Rules:
- Always add proper types — no `any` unless absolutely necessary
- Import paths must use `.js` extension: `import x from '../lib/auth.js'`
- Never remove existing types or interfaces

---

## 3. Auth Middleware — CRITICAL

Every new route that requires login MUST use `requireAuth`:
```typescript
import { requireAuth, requireRole } from '../lib/auth.js';

router.get('/my-route', requireAuth, async (req, res) => { ... });
router.get('/admin-only', requireAuth, requireRole('ADMIN'), async (req, res) => { ... });
```

Public routes (no login needed): `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/system/health`

All other routes MUST have `requireAuth`.

---

## 4. Error Handling — REQUIRED

Every route handler must have try/catch:
```typescript
router.get('/example', requireAuth, async (req, res) => {
  try {
    const data = await prisma.something.findMany();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 5. New Routes — Register in server.ts

If you create a new route file `routes/example.ts`, you MUST also add to `server.ts`:
```typescript
import exampleRouter from './routes/example.js';
app.use('/api/example', exampleRouter);
```

---

## 6. Environment Variables

If the code needs a new environment variable:
1. Add it to `.env.example` with a placeholder value
2. Note it in your response so the developer knows to add it to `.env`

Never hardcode secrets, API keys, or connection strings.

---

## 7. Dependencies

- Do NOT upgrade `prisma` or `@prisma/client` beyond `^5.x.x`
- Do NOT change `prisma` from `devDependencies` to `dependencies`
- Do NOT upgrade major versions of any package without explicit instruction
- If you need a new package, add it with: `npm install package-name`

---

## 8. File Structure — Do Not Break

```
server.ts          ← entry point, do not restructure
routes/            ← one file per domain
lib/
  db.ts            ← always import prisma from here
  auth.ts          ← always import requireAuth from here
  cache.ts         ← Redis
  bus.ts           ← NATS
prisma/
  schema.prisma    ← only edit models here, never datasource/generator blocks
```

Do NOT:
- Move files to different directories
- Rename existing exports that other files import
- Delete existing routes or middleware
- Change the Express app structure in `server.ts`

---

## 9. What a Clean Response Looks Like

When you generate code, your response should include:
1. The changed/new file(s) with full content
2. If Prisma schema changed → say exactly which model changed
3. If new env var added → say its name and what it does
4. If new route added → confirm it has `requireAuth`

---

## Quick Checklist Before Finalizing Code

- [ ] `requireAuth` on every non-public route
- [ ] try/catch in every async route handler
- [ ] New route registered in `server.ts`
- [ ] New env vars added to `.env.example`
- [ ] No Prisma version changes
- [ ] TypeScript types are correct
- [ ] Import paths use `.js` extension

## 🧭 Roadmap-first protocol (mandatory)
Every Cursor / Claude / GPT agent in every chat MUST:
1. Read `/docs/ROADMAP.md` BEFORE writing or editing any file.
2. Run `npm run docs:check` and report drift if any.
3. If implementing a phase, update the corresponding row in `docs/ROADMAP.md`
   and the relevant row in `/docs/ADMIN-PARITY.md` IN THE SAME PR.
4. Any architectural decision goes into `/docs/DECISIONS.md` as a new ADR.
