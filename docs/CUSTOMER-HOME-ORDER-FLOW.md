# Customer Home → Create Order — Product checklist

Living checklist for Home marketing surfaces and the F5 order wizard.  
**Repo language:** technical notes in English only (see `ROADMAP.md` manifest).

## Goals

1. **Category chips (Home)** → Create Order with the **category path** pre-opened in the wizard (browse tree starts at the resolved branch).
2. **Banner CTA (Home)** → Create Order with **category + featured provider context** passed via URL (and optional `prefillServiceCatalogId` when derived from catalog data).
3. **“New offer” (+)** → Create Order with **no pre-selected branch**; user opens the category tree from root; **Other** row explains unsupported requests.
4. **Guest exploration** → User may open `/orders/new` **without** a session, fill steps, and is prompted to **sign in only when** the client must persist a draft (`POST /api/orders/draft`) or submit (server still requires `customerId` today — see ADR-0054).
5. **AI assist (wizard Step 1)** → Optional short text + **“Suggest categories”** uses public `GET /api/categories/search` to propose `initialPathIds` (no new model training; heuristic search only until a dedicated endpoint exists).

## Deep-link query contract (web + Flutter parity)

| Query | Meaning |
|-------|---------|
| `homeCategory` | Slug or keyword matched against `/api/categories/tree` node names (case-insensitive). |
| `prefillServiceCatalogId` | Existing: start draft with this catalog when authenticated. |
| `prefillProviderId` | **Advisory UI only** until order matching accepts a pinned provider (not persisted on draft create). |
| `newOffer=1` | Marketing “blank slate” entry: show helper copy + **Other** affordance. |
| `from` | Existing wizard entry point: `direct` \| `explorer` \| `ai`. |

## Implementation phases

### Phase A — Done in tree (this PR)

- [x] Document contract + ADR (`DECISIONS.md` ADR-0054, this file).
- [x] React: `CustomerHome` header (avatar / placeholder + New offer).
- [x] React: navigation from chips, banners, + button with query params.
- [x] React: `OrderWizard` reads params, resolves `homeCategory` → `initialPathIds`, passes to `Step1ServicePicker` / `CategoryTreeBrowser`.
- [x] React: `CategoryTreeBrowser` **Other** row + optional hint flow.
- [x] React: Step 1 **Suggest categories** from short text (search API).
- [x] React: `/orders/new` route **public**; `postOrderDraft` / `putOrderDraft` no hard `window.location` redirect — wizard sends user to `/auth` with `returnTo`.
- [x] Flutter: `home_screen` top row (avatar + New offer), query-aware navigation to `/orders/new`.
- [x] Flutter: `CreateOrderWizardScreen` — describe-first + **Suggest service type**; **main category** + **service type** dropdowns from public `GET /api/categories/tree` + `GET /api/service-catalog/by-category/:id?deep=1` (no provider-listing inference for category-only links; see ADR-0055). Provider line is **banner-only** (`prefillProviderId`). Manual QA: `docs/CUSTOMER-ORDER-WIZARD-QA-CHECKLIST.md`.

### Phase B — Backend follow-ups (not blocking UI)

- [ ] Persist `prefillProviderId` / `customerPicks` on `Order` draft for matching bias (requires `routes/orders.ts` + Prisma review).
- [ ] Optional `POST /api/categories/suggest-from-text` (server Gemini) for higher-quality level-1..5 suggestions vs search-only.

### Phase C — QA

- [ ] Guest: open `/orders/new` → reach step 1 → sign-in prompt on draft create only.
- [ ] Logged-in: chip + banner + Other paths create or resume drafts without 404 on tree fetch.
