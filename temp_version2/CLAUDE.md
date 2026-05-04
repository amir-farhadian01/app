# Neighborly — Context for Claude Code

## What is this project?
Neighborly is a local services marketplace (similar to TaskRabbit): customers request work, providers deliver it, with contracts and payments on the platform.

## Architecture
This repository is a **monolith** (not microservices):
- **Backend**: Express.js + TypeScript (`server.ts` + `routes/`)
- **Frontend**: React + Vite (`src/`)
- **ORM**: Prisma (`prisma/schema.prisma`)
- **DB**: PostgreSQL
- **Cache**: Redis (`lib/cache.ts`)
- **Message bus**: NATS (`lib/bus.ts`)
- **Auth**: JWT (access + refresh tokens) in `routes/auth.ts`
- **Proxy**: Traefik

## Git workflow
```
[Google AI Studio] → github: amirfarhadian01/Version2 (upstream)
                              ↓ (sync-from-version2.sh)
              [this repo / temp_version2] ← integration branch: release/v1
                              ↓
                    github: amirfarhadian01/Merge (origin)
```

**Sync new code from Version2:**
```bash
./sync-from-version2.sh           # interactive
./sync-from-version2.sh --dry-run # preview changes only
```

## Firebase compatibility shims
AI Studio often emits Firebase imports. This app replaces them with Vite aliases:

```
firebase/auth      → src/lib/shims/firebase-auth.ts      (JWT API)
firebase/firestore → src/lib/shims/firebase-firestore.ts (REST /api/*)
firebase/storage   → src/lib/shims/firebase-storage.ts   (upload endpoint)
firebase/app       → src/lib/shims/firebase-app.ts       (stub)
```

Do not delete these shims; the frontend depends on them.

## File layout
```
server.ts          # entry point — middleware, route registration
routes/
  auth.ts          # POST /api/auth/register, /login, /refresh, /logout
  users.ts         # GET/PUT /api/users/me and admin user management
  services.ts      # Service CRUD
  requests.ts      # Service requests
  contracts.ts     # Customer–provider contracts
  tickets.ts       # Support
  notifications.ts
  companies.ts
  posts.ts
  chat.ts          # Real-time chat
  categories.ts
  admin.ts
  system.ts        # Health check
  transactions.ts
lib/
  db.ts            # Prisma singleton
  cache.ts         # Redis
  bus.ts           # NATS
  auth.ts          # JWT helpers and middleware
src/
  lib/
    api.ts         # HTTP client — prefer this for frontend calls
    firebase.ts    # Re-exports shims (not real Firebase)
    shims/         # Firebase → Express adapters (do not remove)
  pages/
  components/
flutter_project/   # Flutter mobile app (customer + provider)
```

## Three-repo CI/CD
```
[Google AI Studio]
        ↓ generates code
github: amirfarhadian01/Version2   ← upstream (read-oriented)
        ↓ sync-from-version2.yml opens PRs
github: amirfarhadian01/Merge      ← integration repo (this tree)
        ↓ release-to-neighborly.yml on every push to main
github: amirfarhadian01/neighborly ← production
```

**Typical flow:**
1. AI Studio lands commits on `Version2`.
2. `sync-from-version2.yml` opens a PR in `Merge` (scheduled or manual).
3. You review and merge the PR.
4. On merge to `main`, `release-to-neighborly.yml` pushes a clean tree to `neighborly`.
5. `ci.yml` builds the Docker image and publishes to `ghcr.io`.

## GitHub Actions workflows

| File | When | Role |
|------|------|------|
| `ci.yml` | Push to `main` | Build + Docker image → ghcr.io + optional server deploy |
| `release-to-neighborly.yml` | Push to `main` | Sync code to the `neighborly` repo |
| `pr-validation.yml` | PR opened/updated | Typecheck + Prisma / env / auth hints |
| `sync-from-version2.yml` | Daily (cron) or manual | Fetch `Version2`, open sync PR |

## Secrets (Merge repo)
Configure at `github.com/amir-farhadian01/Merge` → Settings → Secrets and variables → Actions.

| Secret | Purpose | Notes |
|--------|---------|--------|
| `SYNC_PATNEIGHBORLY` | GitHub PAT with `repo` scope | Required for sync / release workflows |
| `DEPLOY_HOST` | Linux server IP | Optional — deploy step skips if unset |
| `DEPLOY_USER` | SSH username | Optional |
| `DEPLOY_SSH_KEY` | SSH private key | Optional |

`DEPLOY_*` is only for machine deploy; omit if you do not target a server.

## Adding a repository secret
1. Open `https://github.com/amir-farhadian01/Merge/settings/secrets/actions`
2. Click **New repository secret**
3. Enter the secret name (e.g. `SYNC_PATNEIGHBORLY`)
4. Paste the value
5. Click **Add secret**

## Docker image
Images are built as `ghcr.io/amir-farhadian01/merge:latest`.

Pull on a server:
```bash
docker pull ghcr.io/amir-farhadian01/merge:latest
```

## Checklist when Version2 / AI Studio drops new code
- [ ] Run `sync-from-version2.sh --dry-run` and scan the diff
- [ ] If `prisma/schema.prisma` changed, run migrations locally (`npx prisma migrate dev` — maintainer-owned)
- [ ] New routes: confirm `requireAuth` / public exceptions as intended
- [ ] If `.env.example` changed, mirror variables into your `.env`
- [ ] Ensure new routers are registered in `server.ts`
- [ ] Smoke-test with `npm run dev` and a few API calls
- [ ] Push per your branch policy (e.g. `git push origin release/v1:main`)

## Docker (local stack)
```bash
docker compose up -d          # start dependencies + app
docker compose logs -f app    # follow API logs
docker compose down           # stop stack
```

## Infrastructure defaults
- **PostgreSQL**: port 5432 inside the compose network
- **Redis**: 6379
- **NATS**: 4222
- **App**: 8080 behind Traefik on port 80
- **Traefik dashboard**: `http://localhost:8080`

## Roadmap-first protocol (mandatory)
See **`AGENTS.md`** for the full checklist. Summary:
1. Read `/docs/ROADMAP.md` before edits.
2. Run `npm run docs:check` and report drift.
3. When shipping a phase, update `ROADMAP.md` and `/docs/ADMIN-PARITY.md` together.
4. Record architectural decisions in `/docs/DECISIONS.md` (ADR format).
