# Phase 0 — Repository Cleanup Plan

**Source of Truth:** [`files/ROADMAP.md`](../files/ROADMAP.md) · [`files/AGENTS.md`](../files/AGENTS.md) · [`files/FEATURES.md`](../files/FEATURES.md) · [`files/START_HERE.md`](../files/START_HERE.md)

## Pre-Cleanup Assessment

### Files to DELETE (confirmed not needed)

| Item | Status | Notes |
|------|--------|-------|
| `repoversion2/` | ⏳ Not in `ls` output but referenced in configs | Remove from [`tsconfig.json`](../tsconfig.json:29) exclude list if dir doesn't exist |
| `temp_version2/` | ⏳ Referenced in [`tsconfig.json`](../tsconfig.json:29) exclude | Remove from exclude list |
| `scratch/` | ⏳ Referenced in docs | Delete if exists |
| Root `*.png` files | ⏳ 11 files listed in task | Delete all |
| `.backend.pid` | ⏳ | Delete |
| `.flutter.pid` | ⏳ | Delete |
| `sync-from-version2.sh` | ⏳ Referenced in [`docs/CLAUDE.md`](../docs/CLAUDE.md:28) and GitHub workflow | Delete script, update references |
| `provider-ui-mock.html` | ⏳ Referenced in [`docs/ui.txt`](../docs/ui.txt:74) | Delete |

### Files to KEEP (inspected and confirmed)

| File | Decision | Reason |
|------|----------|--------|
| [`index.html`](../index.html:1) | **KEEP** | It's the Vite entry point — contains `<div id="root">` and `<script type="module" src="/src/main.tsx">` |
| [`run-project.sh`](../run-project.sh:1) | **KEEP** | Valid startup script, no references to `repoversion2/` or stale paths. Uses `frontend/` correctly. |

### Files to UPDATE

| File | Action |
|------|--------|
| [`.gitignore`](../.gitignore:1) | Already has `*.pid`, `.backend.pid`, `.flutter.pid`, `*.png`, `coverage/`, `frontend/coverage/`, `dist/`, `frontend/dist/` — verify completeness |
| [`README.md`](../README.md:1) | Rewrite with Neighborly 2.0 content per task spec |
| [`CLAUDE.md`](../CLAUDE.md:1) | Add `files/AGENTS.md` reference block at top |
| [`tsconfig.json`](../tsconfig.json:28) | Remove `temp_version2` from `exclude` array |

### docs/ Folder — Copy Strategy

**Copy from `files/` into `docs/` (overwrite):**
- `files/ROADMAP.md` → `docs/ROADMAP.md`
- `files/FEATURES.md` → `docs/FEATURES.md`
- `files/AGENTS.md` → `docs/AGENTS.md`
- `files/START_HERE.md` → `docs/START_HERE.md`

**KEEP untouched:**
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/GLOSSARY.md`

## Execution Steps

### Step 1 — Delete stale backup directories
```bash
rm -rf repoversion2/ temp_version2/ scratch/
```

### Step 2 — Delete root-level screenshot PNGs
```bash
rm -f admin_audit.png admin_users.png admin_users_direct.png admin_users_success.png
rm -f flutter_audit.png flutter_audit_v2.png flutter_auth.png
rm -f login_debug.png login_mobile.png react_audit.png react_auth_desktop.png
# Also catch any other PNGs at root
find . -maxdepth 1 -name "*.png" -delete
```

### Step 3 — Delete PID and legacy script files
```bash
rm -f .backend.pid .flutter.pid sync-from-version2.sh provider-ui-mock.html
```

### Step 4 — Update .gitignore
Already has all required entries. Verify:
- `*.pid` ✓ (line 13)
- `.backend.pid` ✓ (line 14)
- `.flutter.pid` ✓ (line 15)
- `*.png` ✓ (line 18)
- `coverage/` ✓ (line 34)
- `frontend/coverage/` ✓ (line 33)
- `dist/` ✓ (line 3)
- `frontend/dist/` ✓ (line 4, 26)
- `flutter_project/build/` ✓ (line 27)
- `.DS_Store` ✓ (line 7)
- `Thumbs.db` — **MISSING**, add it

### Step 5 — Update tsconfig.json exclude
Remove `temp_version2` from exclude array.

### Step 6 — Copy docs from files/ to docs/
```bash
cp files/ROADMAP.md docs/ROADMAP.md
cp files/FEATURES.md docs/FEATURES.md
cp files/AGENTS.md docs/AGENTS.md
cp files/START_HERE.md docs/START_HERE.md
```

### Step 7 — Rewrite README.md
Replace with Neighborly 2.0 content per task spec.

### Step 8 — Update CLAUDE.md
Add at the very top:
```
> READ files/AGENTS.md COMPLETELY BEFORE WRITING ANY CODE.
> Then read files/ROADMAP.md. Then read files/FEATURES.md.
```

### Step 9 — Final Verification
```bash
ls -la | grep -E "repoversion2|temp_version2|scratch"  # must return nothing
ls *.png 2>/dev/null                                    # must return nothing
ls .*.pid 2>/dev/null                                   # must return nothing
grep "*.pid" .gitignore                                 # must find the line
ls docs/                                                # must show 4 new files + existing 3
npm run dev &; sleep 5; curl http://localhost:8077/health; kill %1
```

### Step 10 — Commit
```bash
git add -A
git commit -m "chore(cleanup): Phase 0 repo cleanup - remove stale files and update docs"
```

## Verification Checklist

- [ ] No directories: `repoversion2/`, `temp_version2/`, `scratch/`
- [ ] No `.png` screenshots at root
- [ ] No `.backend.pid` or `.flutter.pid` files
- [ ] No `sync-from-version2.sh` or `provider-ui-mock.html`
- [ ] `.gitignore` updated with `Thumbs.db`
- [ ] `tsconfig.json` exclude updated
- [ ] `docs/` has: `ROADMAP.md`, `FEATURES.md`, `AGENTS.md`, `START_HERE.md`
- [ ] `docs/DECISIONS.md`, `ARCHITECTURE.md`, `GLOSSARY.md` untouched
- [ ] `README.md` reflects Neighborly 2.0
- [ ] `CLAUDE.md` has `files/AGENTS.md` reference at top
- [ ] No Persian/Farsi text in any changed file
- [ ] Backend starts after cleanup
- [ ] Commit: `chore(cleanup): Phase 0 repo cleanup - remove stale files and update docs`
