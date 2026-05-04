#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-from-version2.sh
# ─────────────────────────────────────────────────────────────────────────────
# Workflow:
#   1. Fetch latest from amirfarhadian01/Version2 (upstream)
#   2. Show what changed
#   3. Merge into release/v1 (the integration branch)
#   4. Push to amirfarhadian01/Merge (origin)
#
# Usage:
#   ./sync-from-version2.sh           → interactive (shows diff, asks before push)
#   ./sync-from-version2.sh --dry-run → just show what would change, no merge
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

UPSTREAM_BRANCH="upstream/main"
LOCAL_BRANCH="release/v1"
ORIGIN_BRANCH="main"
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Neighborly — Sync from Version2 → Merge ${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

# ── 1. Make sure we're on the right branch ───────────────────────────────────
CURRENT=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT" != "$LOCAL_BRANCH" ]]; then
  echo -e "${YELLOW}⚠ Switching from '$CURRENT' to '$LOCAL_BRANCH'...${NC}"
  git checkout "$LOCAL_BRANCH"
fi

# ── 2. Fetch upstream (Version2) ─────────────────────────────────────────────
echo -e "${BLUE}▶ Fetching from upstream (Version2)...${NC}"
git fetch upstream 2>&1 | sed 's/^/  /'
echo ""

# ── 3. Show what's new ────────────────────────────────────────────────────────
NEW_COMMITS=$(git log HEAD.."$UPSTREAM_BRANCH" --oneline)
if [[ -z "$NEW_COMMITS" ]]; then
  echo -e "${GREEN}✓ Already up to date. Nothing to sync.${NC}"
  exit 0
fi

echo -e "${GREEN}New commits in Version2 (not yet in Merge):${NC}"
echo "$NEW_COMMITS" | sed 's/^/  → /'
echo ""

# ── 4. Show file-level diff summary ──────────────────────────────────────────
echo -e "${YELLOW}Files that will change:${NC}"
git diff HEAD.."$UPSTREAM_BRANCH" --name-status | sed 's/^/  /'
echo ""

# Check for Prisma schema changes
if git diff HEAD.."$UPSTREAM_BRANCH" --name-only | grep -q "prisma/schema.prisma"; then
  echo -e "${RED}⚠ PRISMA SCHEMA CHANGED — after merging you must run:${NC}"
  echo -e "  npx prisma migrate dev --name <describe_change>"
  echo -e "  npx prisma generate"
  echo ""
fi

# Check for new env vars
if git diff HEAD.."$UPSTREAM_BRANCH" --name-only | grep -q ".env.example"; then
  echo -e "${YELLOW}⚠ .env.example changed — check for new environment variables${NC}"
  echo ""
fi

if $DRY_RUN; then
  echo -e "${BLUE}DRY RUN — no changes made.${NC}"
  exit 0
fi

# ── 5. Merge ─────────────────────────────────────────────────────────────────
echo -e "${BLUE}▶ Merging upstream/main into $LOCAL_BRANCH...${NC}"
if ! git merge "$UPSTREAM_BRANCH" --no-edit -m "chore: sync from Version2 $(date +%Y-%m-%d)"; then
  echo ""
  echo -e "${RED}✗ Merge conflict! Resolve conflicts then run:${NC}"
  echo -e "  git add -A && git commit && ./sync-from-version2.sh --push-only"
  exit 1
fi
echo ""

# ── 6. Push to Merge (origin) ────────────────────────────────────────────────
read -p "Push to origin (amirfarhadian01/Merge)? [y/N] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}▶ Pushing to origin/main...${NC}"
  git push origin "$LOCAL_BRANCH:$ORIGIN_BRANCH"
  echo -e "${GREEN}✓ Done! Code is now in amirfarhadian01/Merge${NC}"
else
  echo -e "${YELLOW}Skipped push. Run manually: git push origin $LOCAL_BRANCH:$ORIGIN_BRANCH${NC}"
fi
