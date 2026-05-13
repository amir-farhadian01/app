# Architecture Decision Records (lightweight)

## ADR-0001 — Keep Prisma at v5
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `package.json` pins `@prisma/client` and `prisma` to `^5.22.0`;
`prisma/schema.prisma` uses the v5-style `datasource db { url = env("DATABASE_URL") }`
block.
**Decision:** Stay on Prisma 5.x; agents do not run migrations.
**Consequences:** ✅ stable toolchain ❌ no Prisma 6/7-only features.

## ADR-0002 — Admin endpoints under /api/admin/* with isAdmin middleware
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `server.ts` mounts `adminRoutes` at `/api/admin` and `adminKycRoutes`
at `/api/admin/kyc`; `routes/admin.ts` and `routes/adminKyc.ts` apply
`router.use(authenticate, isAdmin)` from `lib/auth.middleware.ts`.
**Decision:** Admin JSON APIs live only under `/api/admin` with shared admin
gate.
**Consequences:** ✅ single RBAC choke-point ❌ public callers must not rely on
these paths.

## ADR-0003 — KYC has 3 levels; legacy `model KYC` kept as shim
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `prisma/schema.prisma` defines `KYC` plus newer `KycLevel0Profile`,
`KycPersonalSubmission`, and `BusinessKycSubmission`; `routes/adminKyc.ts`
mirrors approved personal status into legacy `KYC` rows.
**Decision:** New flows use v2 tables; legacy model remains for compatibility.
**Consequences:** ✅ migration path ❌ dual writes until legacy retired.

## ADR-0004 — BusinessKycFormSchema is versioned; submissions keep historical schemaVersion
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `BusinessKycFormSchema` has `version Int @unique`; `BusinessKycSubmission`
stores `schemaVersion Int` and `answers Json`.
**Decision:** Treat published schemas as immutable versions tied to submissions.
**Consequences:** ✅ auditability ❌ migrations need careful publishing.

## ADR-0005 — Client-side AI for KYC OCR/fraud (cost on user)
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `@google/genai` is imported from `src/` services/components with
browser-side API key wiring (`VITE_GEMINI_API_KEY`).
**Decision:** Keep Gemini calls client-side unless/until a reviewed server
proxy exists.
**Consequences:** ✅ fast iteration ❌ key exposure surface must be guarded in
deployment.

## ADR-0006 — Customer Flutter cabin: 4-tab bottom nav, no center FAB
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `flutter_project/lib/widgets/neighborly_shell.dart` builds four
equal bottom cells for customers and has no `FloatingActionButton`.
**Decision:** Preserve this navigation contract for the customer cabin rebuild.
**Consequences:** ✅ consistent UX ❌ feature additions must fit four slots or
use inner screens.

## ADR-0007 — (placeholder) Order routing: auto_book vs round_robin_5
**Date:** 2026-04-24 **Status:** Proposed
**Context:** No matching-engine symbols located in source during roadmap pass.
**Decision:** TBD once F6 scope lands.
**Consequences:** TBD.

## ADR-0008 — (placeholder) In-chat PII blocking + AI translation policy
**Date:** 2026-04-24 **Status:** Proposed
**Context:** Chat routes/models exist; guards not verified here.
**Decision:** TBD under F7.
**Consequences:** TBD.

## ADR-0009 — docs/AGENTS.md is documentation only; code wins on conflict
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `docs/AGENTS.md` (formerly root `AGENTS.md`) previously contained historical Firebase/Firestore
wording; the running app and schema use PostgreSQL, Prisma, and Express routes.
**Decision:** Treat `docs/AGENTS.md` (and similar guides) as non-authoritative; on
any conflict, **code and `prisma/schema.prisma` win**; update docs to match.
**Consequences:** ✅ less doc/code drift confusion ❌ agents must re-read
`ROADMAP.md` and code when instructions disagree.

## ADR-0010 — ROADMAP drift-check commands target the defining source file
**Date:** 2026-04-24 **Status:** Accepted
**Context:** F1 evidence lives in `lib/adminUsersList.ts` while
`routes/admin.ts` only delegates; grepping the router for implementation
detail is misleading.
**Decision:** `docs/ROADMAP.md` **Drift checks (commands):** must `grep` /
`test` the file where the symbol or string **actually** lives.
**Consequences:** ✅ `npm run docs:check` reflects real implementation ❌ moving
code requires updating the phase’s check lines.

## ADR-0011 — Dynamic service questionnaires on `ServiceCatalog`, not on `Service`
**Date:** 2026-04-24 **Status:** Accepted
**Context:** F5 will render order questions from a shared type definition;
per-provider `Service` rows are offers/pricing, not the canonical “job type”
form.
**Decision:** Store `dynamicFieldsSchema` and matching defaults on
`ServiceCatalog` only; per-provider `Service` stays a listing and may link
via `serviceCatalogId` for counts.
**Consequences:** ✅ one schema per product type ❌ all providers sharing a
type see the same questionnaire (by design).

## ADR-0012 — `ServiceQuestionnaireV1` mirrors `BusinessKycFormV1` for reuse
**Date:** 2026-04-24 **Status:** Accepted
**Context:** `lib/kycTypes.ts` + `isBusinessKycFormV1` + form builder are
proven; order wizard is another dynamic form.
**Decision:** `ServiceFieldDef` / `ServiceQuestionnaireV1` follow the KYC
field/schema shape; validators and future UI can share patterns
(`lib/serviceQuestionnaireValidate.ts` mirrors `kycBusinessValidate` style).
**Consequences:** ✅ faster F5 / admin parity ❌ two parallel type guards
(`isServiceQuestionnaireV1` vs KYC) must stay in sync for shared field kinds.

## ADR-0013 — Service Definition editor is a fork of KYC FormBuilder patterns
**Date:** 2026-04-25 **Status:** Accepted
**Context:** KYC’s `FormBuilder` layout (sections/fields, inspector, preview) is
proven, but KYC and service-catalog questionnaires have different type sets and
evolve on different product timelines.
**Decision:** Implement the admin Service Definition experience as a **sibling**
folder `src/components/admin/serviceDefinitions/`, reusing the same *patterns*
(state, debounced autosave, three-pane layout) by copy/adapt, **not** by importing
`src/components/admin/kyc/formBuilder/*`.
**Consequences:** ✅ independent refactors; ❌ some duplication of UI wiring
must be maintained consciously when shared primitives are desired later.

## ADR-0014 — `Order` is a new model distinct from `Request`
**Date:** 2026-04-24 **Status:** Accepted
**Context:** Legacy `Request` ties a customer to a single provider and a
`Service` row; F5 needs customer intent before any provider is chosen.
**Decision:** Introduce `Order` for the customer journey (catalog + answers +
schedule + address); keep `Request` unchanged for backward compatibility with
the provider dashboard.
**Consequences:** ✅ clear domain split ❌ two parallel “job” concepts until
legacy flows are retired or bridged.

## ADR-0015 — Order state machine for F5 MVP: draft → submitted → cancelled
**Date:** 2026-04-24 **Status:** Accepted
**Context:** Matching, contracts, and payments are out of scope for Sprint C
PROMPT 1–3; later phases need reserved enum values without breaking migrations.
**Decision:** `OrderStatus` includes `matching`, `matched`, `contracted`, `paid`,
`in_progress`, `completed` as **reserved** values; F5 backend only transitions
among `draft`, `submitted`, and `cancelled`.
**Consequences:** ✅ forward-compatible enum ❌ agents must not wire reserved
states until their phase lands.

## ADR-0016 — AI coach for order description: client-side Gemini; store text + flag
**Date:** 2026-04-24 **Status:** Accepted
**Context:** Order wizard will offer an AI-assisted description (PROMPT 2+);
operators want cost on the end user and minimal server retention of model I/O.
**Decision:** Run Gemini coaching in the browser (same pattern family as KYC
document analysis); persist only the final user-edited `description` and
`descriptionAiAssisted` on `Order`.
**Consequences:** ✅ no server Gemini dependency for F5 ❌ key hygiene remains
a deployment concern (see ADR-0005).

## ADR-0021 — Form builder stays in-house; SurveyJS/Formio deferred
**Date:** 2026-04-24 **Status:** Accepted
**Context:** Admin Service Definitions need a schema editor, preview, and
validation. Heavier form-builder products exist (SurveyJS, Formio) but add
weight and licensing considerations for a monolith that already has typed
`ServiceQuestionnaireV1` and native preview.
**Decision:** Keep the in-house form builder in React + `ServiceQuestionnaireV1`
until a concrete need (e.g., very complex branching) justifies a third-party
embed.
**Consequences:** ✅ no new form-builder stack ❌ we maintain widgets and
validation ourselves.

## ADR-0022 — PreviewAsCustomer uses native HTML widgets; photo is local-only
**Date:** 2026-04-24 **Status:** Accepted
**Context:** Admins need to see customer-facing inputs while authoring the
service questionnaire. Photo fields must be distinguishable from text fields
without wiring upload in the admin preview.
**Decision:** `PreviewAsCustomer` maps each `ServiceFieldType` to native
controls; photo preview holds `File[]` in memory with thumbnails. Actual
uploads are handled in the F5 order flow via `/api/upload` (or equivalent),
not in the admin preview.
**Consequences:** ✅ WYSIWYG for layout ❌ no upload persistence from preview.

## ADR-0023 — Form Builder rebuilt from scratch on attempt 2
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Patches to the in-house form builder failed to show visible UI
improvements in the admin preview/inspector, blocking confidence in
`ServiceQuestionnaireV1` authoring.
**Decision:** `PreviewAsCustomer.tsx` and `PropertyInspector.tsx` were fully
replaced. Builder validation for save-blocking errors lives in
`lib/serviceQuestionnaireBuilderValidate.ts`. Regression risk is acceptable on
this single feature; it is the canonical builder going forward.
**Consequences:** ✅ predictable widget mapping + inspectable code paths
❌ a full regression pass on the Service Definitions flow is still expected.

## ADR-0024 — Tree read: `GET /api/categories/tree-with-services` (single round-trip)
**Date:** 2026-04-25 **Status:** Accepted
**Context:** The admin and customer UIs need a reparentable, sortable category
hierarchy and attached catalog rows without N+1 round-trips. F0 caps visible
depth at 5; archived rows are operator-only in most views.
**Decision:** Expose an authenticated `GET /api/categories/tree-with-services`
that returns a nested `Category` tree (with `depth`, `children`, `sortOrder`,
`archivedAt`, `icon`, `description`) and `ServiceCatalogLite` (including
`slug`, `isActive`, `_count.providerServices`) only on categories that have no
child category rows. Admins may pass `includeArchived`; non-admins are rejected
if they set it. Deeper than five levels is not serialized; the server logs once
per elided node when a depth cap is hit.
**Consequences:** ✅ one payload for the tree editor ❌ clients must not assume
unbounded depth beyond the cap.

## ADR-0025 — Admin tree mutations: `/api/admin/categories-tree` + `lib/categoryTreeOps.ts`
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Reordering, soft-archive, and create-child operations must
preserve `sortOrder` within siblings, forbid cycles, and keep insertion depth
≤5. Archive/unarchive of categories and services is restricted to
`owner` / `platform_admin`.
**Decision:** Add `Category.sortOrder` / `archivedAt` and matching fields on
`ServiceCatalog` with Prisma indexes on `(parentId, sortOrder)` and
`(categoryId, sortOrder)`. Implement `POST` handlers under
`/api/admin/categories-tree` (mounted in `server.ts`) behind
`authenticate` + `isAdmin`, with `reorder-category`, `reorder-service`,
`archive-*`, `unarchive-*`, `create-child-category`, and `create-leaf-service`.
Shared validation and sibling resequencing live in `lib/categoryTreeOps.ts`
(`computeDepth`, `willExceedDepth`, `detectCycle`, `resequenceSiblings`).
**Consequences:** ✅ consistent ordering and safe moves ❌ UI drag-drop
(PROMPT 2) must call these contracts.

## ADR-0026 — Workspaces and `ProviderServicePackage` as the unit of sellable offers
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Providers need per-company (workspace) pricing and booking rules without duplicating the global service catalog.
**Decision:** Introduce `Workspace` as the company container; `ProviderServicePackage` links `workspaceId`, `userId` (provider), `serviceCatalogId`, `bookingMode`, pricing, and lifecycle fields. Orders continue to target catalog-backed definitions; package rows scope provider offers.
**Consequences:** ✅ clear ownership and listing filters ❌ extra joins for cross-workspace admin views.

## ADR-0027 — `ServiceCatalog.lockedBookingMode` overrides explicit package mode
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Admins need to stop negotiation on a regulated catalog entry while most packages stay inheriting defaults.
**Decision:** `lockedBookingMode` is `null` (free) or one of `auto_appointment` / `negotiation`. Admin `PUT` rejects (`409`) if existing packages have an *explicit* `bookingMode` that would disagree with the new lock. Provider APIs validate with `assertBookingModeAllowedForCatalog`.
**Consequences:** ✅ predictable “lock wins” semantics ❌ providers must retune or archive conflicting packages.

## ADR-0028 — Effective booking label: lock wins, else package, else inherit
**Date:** 2026-04-25 **Status:** Accepted
**Context:** UIs need one string for tables and draw without duplicating three-way logic.
**Decision:** `effectiveBookingModeLabel(catalogLocked, packageMode)` in `bookingModeUtils.ts` labels locked row tone vs inherit vs explicit negotiation/auto.
**Consequences:** ✅ one helper for admin + provider tables ❌ label copy must track enum renames in Prisma.

## ADR-0029 — BOM snapshots are frozen at link time
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Package BOM lines must keep stable cost inputs when catalog `Product` rows change.
**Decision:** `ProductInPackage` stores `snapshotUnitPrice`, `snapshotCurrency`, `snapshotProductName`, and `snapshotUnit` at create (and on explicit refresh). Editing a `Product` does not mutate existing BOM rows; providers refresh via **Refresh prices from inventory** (per line or all).
**Consequences:** ✅ auditable package economics ❌ stale snapshots until refresh.

## ADR-0030 — Cost / margin / marginPercent computed on read only
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Persisted margin fields drift from BOM or price edits.
**Decision:** `computePackageMargin` in `lib/packageMargin.ts` derives `bomCost`, `crossCurrencyLines`, `margin`, and `marginPercent` from the package `finalPrice`/`currency` and BOM snapshot lines whenever packages or BOM endpoints are read; values are not stored on `ProviderServicePackage`.
**Consequences:** ✅ single source of truth ❌ every list/detail query does a small sum.

## ADR-0031 — Labor is a normal Product row
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Avoid a parallel “manual line items” structure for labor vs materials.
**Decision:** Labor uses `Product` with `category` such as `Labor` and `unit` of `hour` or `flat` (or other agreed units); BOM lines reference the same `ProductInPackage` model.
**Consequences:** ✅ one inventory + BOM model ❌ UI must filter/group by category where needed.

## ADR-0032 — Mixed-currency BOM lines: warn, do not convert (Phase 1)
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Providers may source items priced in different currencies than the package list price.
**Decision:** Lines whose `snapshotCurrency` ≠ package `currency` are counted in `crossCurrencyLines` and excluded from `bomCost`; the workspace package `currency` is the display currency; Phase 1 does not FX-convert.
**Consequences:** ✅ honest partial cost when mixed ❌ operators must refresh or normalize data manually.

## ADR-0033 — Order table name unchanged; `phase` derived from `status`
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Nine `OrderStatus` values need business-level grouping without renaming the `Order` model or enum.
**Decision:** Add nullable `Order.phase` (`OrderPhase`) computed from `status` via `lib/orderPhase.ts` (`phaseFromStatus`). Every route mutation that changes `status` updates `phase` in the same Prisma write.
**Consequences:** ✅ stable API/table names ❌ two fields must stay aligned on writes.

## ADR-0034 — Cancelled rows keep last non-draft `phase`
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Admins and customers need to filter “cancelled offers” vs “cancelled jobs”.
**Decision:** On transition to `cancelled`, set `phase` to `phaseFromStatus('cancelled', previousPhase)`. Backfill uses `AuditLog` metadata (`previousStatus`, etc.) when present; otherwise safe default `offer`.
**Consequences:** ✅ meaningful cancelled buckets ❌ cancel audit metadata should stay accurate.

## ADR-0035 — Shared phase contract for customer and admin UIs
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Same lifecycle labels must appear consistently; only authorization scope differs.
**Decision:** Customer `GET /api/orders/me` and admin `GET /api/admin/orders` use the same `phase` / `phase[]` / `includeDrafts` rules and the same `facets.phase` shape; customer lists are scoped to `customerId`.
**Consequences:** ✅ one mental model ❌ both surfaces must update when phase rules change.

## ADR-0036 — Auto-appointment matching runs synchronously on submit
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Sprint I requires instant provider visibility in Inbox after customer submit, without queue infrastructure.
**Decision:** `autoMatchOffer` runs inline in `POST /api/orders/draft/:id/submit` with a practical 2-second latency budget target. If matching finds no eligible candidate (or retries are exhausted), the order stays/submits in `offer` phase with `status='submitted'` and `autoMatchExhausted=true`.
**Consequences:** ✅ simple, deterministic flow and easy debugging ❌ submit path now includes matching cost and can grow with traffic.

## ADR-0037 — OfferMatchAttempt is the source of truth for match decisions
**Date:** 2026-04-25 **Status:** Accepted
**Context:** We need an auditable stream of invites/matches/declines now, and reusable analytics inputs for later sprints.
**Decision:** Persist every decision in `OfferMatchAttempt` and treat it as canonical for Sprint J round-robin orchestration and Sprint M lost-deal analytics.
**Consequences:** ✅ clear event history and replayability ❌ more joins when rendering order timelines.

## ADR-0038 — Provider response rate is recomputed on demand
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Sprint I traffic is low; caching response-rate aggregates adds complexity and invalidation risk.
**Decision:** Compute provider response rate from last-30-day `OfferMatchAttempt` statuses (`accepted/declined/expired`) at read-time in eligibility scoring; do not cache in Sprint I.
**Consequences:** ✅ no cache coherence burden now ❌ extra query/aggregation overhead per match evaluation (revisit in Sprint Q analytics).

## ADR-0039 — Round-robin pool size 5, window 24h, env-tunable
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Negotiation-mode offers need concurrent invitations with bounded latency, while preserving a deterministic customer decision window.
**Decision:** Round-robin invites up to 5 eligible negotiation packages with a 24h window by default (`ROUND_ROBIN_POOL_SIZE`, `ROUND_ROBIN_WINDOW_HOURS`). Replacements on decline/expiry fill the slot but always reuse the original slot/window expiry timestamp (no window extension).
**Consequences:** ✅ predictable customer window and provider fairness ❌ late declines can produce immediately expiring replacements near window end.

## ADR-0040 — Lost-deal feedback is captured per attempt
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Providers need a lightweight way to report why they lost an invite after decline, expiry, or supersede without blocking workflow completion.
**Decision:** Persist feedback directly on `OfferMatchAttempt` as `(reasons[], otherText, providerComment)` in `lostFeedback`, with denormalized `lostReason` CSV for fast filtering. Aggregation and analytics dashboards are deferred to Sprint N.
**Consequences:** ✅ keeps feedback attached to concrete decision events ❌ reporting remains limited until Sprint N analytics surfaces land.

## ADR-0041 — Customer priority templates persist on User.orderPriorities
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Customers selecting among multiple accepted providers may want to reuse weighting preferences for future offers.
**Decision:** Allow `POST /api/orders/:id/select-provider` to persist `priorityTemplate.weights` into `User.orderPriorities` with `savedAt`. Scorers read user weights when present and fall back to Sprint I defaults otherwise.
**Consequences:** ✅ reusable personalization without a new table ❌ template governance/versioning remains lightweight in Sprint J.

## ADR-0042 — Stale-attempt expiry is lazy/on-demand
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Sprint J requires invite expiry behavior but current traffic does not justify operational overhead for a dedicated scheduler.
**Decision:** Compute expiry lazily on inbox/candidates access via `expireStaleAttempts(orderId)`; mark stale invited attempts as `expired` and run slot replacement as needed. Cron/background sweeping is deferred until traffic demands it.
**Consequences:** ✅ simpler rollout and no background worker dependency ❌ stale records update only when relevant endpoints are hit.

## ADR-0043 — Chat is order-scoped with strict participants
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Sprint K chat must stay aligned with order lifecycle and never become a general direct-message channel.
**Decision:** Introduce `OrderChatThread` keyed by `orderId` (one thread per order). Only the order customer, matched provider, and admin roles can access it. Thread creation is lazy on first open once `matchedProviderId` exists.
**Consequences:** ✅ clear access boundary and audit trail per order ❌ users cannot reuse history across unrelated orders.

## ADR-0044 — PII guard is server-enforced on send
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Client-side checks are bypassable and cannot be trusted for contact-sharing prevention.
**Decision:** Every outgoing order-chat message passes through `moderateMessage` on the server. Contact artifacts are masked by default, explicit exchange intent is flagged, and repeated masked attempts in 24h are blocked.
**Consequences:** ✅ consistent enforcement across all clients ❌ occasional false positives require admin moderation workflows.

## ADR-0045 — Translation is additive metadata; original content is preserved
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Moderation and legal review require immutable source text even when translation is enabled.
**Decision:** Persist `originalText` and moderation-safe `displayText` as canonical message content. Store translation as optional metadata (`sourceLang`, `targetLang`, `translatedText`) with graceful fallback to original text when AI translation is unavailable.
**Consequences:** ✅ audit-safe history with multilingual UX support ❌ translation caching is single-target and may be recomputed for different targets.

## ADR-0046 — PII guard is server-enforced; UI only reflects status
**Date:** 2026-04-25 **Status:** Accepted
**Context:** Admin and participant UIs may show badges, previews, or translated text, but the browser cannot be the enforcement boundary for contact-sharing rules (see ADR-0044).
**Decision:** Treat all chat moderation outcomes (`moderationStatus`, `displayText`, block vs send) as authoritative from the API only. Client components must not re-classify or “un-mask” content; the admin moderation UI lists server-flagged rows and actions (`review`, `escalate`, `note`) mutate persisted metadata without changing enforcement logic.
**Consequences:** ✅ consistent trust model across web/admin/ future clients ❌ UI-only hints cannot replace a missing server guard.

## ADR-0047 — Contract is versioned immutable snapshots; only newest version can be acted on
**Date:** 2026-04-26 **Status:** Accepted
**Context:** Matched orders need auditable legal text; edits must not mutate history after send.
**Decision:** Persist each negotiation round as `ContractVersion` rows (immutable snapshot fields). Customer approve/reject applies only to the **newest** `sent` version; older rows transition to `superseded` instead of being overwritten.
**Consequences:** ✅ clear audit trail ❌ more rows per order.

## ADR-0048 — Approval transitions order to `contracted` (if not already), then unlocks payment link generation in Sprint M
**Date:** 2026-04-26 **Status:** Accepted
**Context:** Payments (Sprint M) must attach to a customer-approved contract baseline.
**Decision:** `POST .../approve` sets `Order.status` to `contracted` and `phase` to `job` via `phaseFromStatus` (idempotent if already contracted). `OrderContract.currentVersionId` points at the approved `ContractVersion`.
**Consequences:** ✅ single gate for “contract signed off” ❌ re-opening a job after approve needs a later phase/ADR if product requires it.

## ADR-0049 — AI contract suggestion is advisory; final legal text is always explicit and user-editable
**Date:** 2026-04-26 **Status:** Accepted
**Context:** `draft-from-ai` accelerates drafting but must not auto-bind parties without review.
**Decision:** AI output creates a **draft** `ContractVersion` with `generatedByAi=true`; providers must **send** explicitly; customers **approve** in a separate step. Manual `POST .../draft` remains first-class.
**Consequences:** ✅ human-in-the-loop ❌ no one-click “AI signed contract”.

## ADR-0050 — Contract mismatch guard checks chat-summary vs clauses and emits non-blocking warnings
**Date:** 2026-04-26 **Status:** Accepted
**Context:** Chat and drafted terms can drift (visits, price mentions).
**Decision:** `lib/contractMismatchGuard.ts` returns string warnings; persisted on the version as `mismatchWarnings` JSON and returned to clients; never blocks send/approve.
**Consequences:** ✅ visibility for support ❌ heuristic false positives possible.

## ADR-0051 — Contract version approvals are append-only events; historical versions remain immutable for auditability
**Date:** 2026-04-26 **Status:** Accepted
**Context:** Support and disputes require a tamper-evident history of what was proposed and approved.
**Decision:** `ContractVersion` snapshot fields are not rewritten in place after send; transitions use status changes plus `ContractEvent` rows (`customer_approved`, `admin_marked_reviewed`, `admin_internal_note`, etc.). Supersede creates a new terminal status on a row without deleting it.
**Consequences:** ✅ audit-grade timeline ❌ more storage per negotiation round.

## ADR-0052 — Pre-match order chat read for invited workspace members
**Date:** 2026-04-28 **Status:** Accepted
**Context:** Round-robin and invite flows surface orders in the provider inbox before `Order.matchedProviderId` is set; workspace staff hit `400` from `/api/orders/:id/chat/thread` and saw harsh errors in Flutter.
**Decision:** `routes/orderChat.ts` creates or reuses `OrderChatThread` using a provisional `providerId` from the newest active `OfferMatchAttempt` (`invited` / `accepted` / `matched`) when the order is not yet matched. Users who pass `listMyWorkspaces` membership against an attempt’s `workspaceId` receive role `invited_provider`, `readOnly: true` on GET, and `403` with `CHAT_READ_ONLY_UNTIL_MATCHED` on POST message/translate. Matched workspace staff and the matched provider keep full `provider` behavior. Stable machine codes: `NO_MATCHED_PROVIDER` when no attempt exists yet; `orderContracts` gate returns `code: NO_MATCHED_PROVIDER` / `ORDER_STATE` alongside `error` text.
**Consequences:** ✅ negotiation transparency for invited teams ❌ invited readers cannot post until match; thread `providerId` updates when the order becomes matched.

## ADR-0054 — Home → Order deep links + guest wizard entry (web + Flutter)
**Date:** 2026-05-02 **Status:** Accepted (Phase A)
**Context:** Marketing Home (`/` / Flutter `/`) must route into Create Order with category context from chips/banners, a “New offer” entry with an explicit **Other** path for unsupported taxonomies, and guests want to explore the wizard before signing in. Order rows still require a real `customerId` (`prisma` `Order.customerId` is non-null).
**Decision:**
1. **Query contract** — `homeCategory`, `prefillServiceCatalogId`, `prefillProviderId` (UI-only until matching persists it), `newOffer=1`, plus existing `from` / `serviceCatalogId` / `entryPoint` (Flutter). Documented in `docs/CUSTOMER-HOME-ORDER-FLOW.md`.
2. **Category resolution** — Clients fetch public `GET /api/categories/tree` and resolve `homeCategory` to `pathIds[]` by name/slug heuristic; pass as `initialPathIds` into the React `CategoryTreeBrowser` / Flutter wizard hints.
3. **Guest web** — `Route /orders/new` renders `OrderWizard` without forcing `<Navigate to="/auth" />`. Draft API calls still return **401** without a token; HTTP client **must not** hard-redirect the whole tab — the wizard navigates to `/auth` with `returnTo` including the current query string.
4. **Provider hint** — Banner flows may pass `prefillProviderId` for display/copy only in Phase A; matching logic unchanged.
5. **AI assist (Phase A)** — “Suggest categories” uses existing public `GET /api/categories/search?q=…` over user text, not a new trained endpoint.
**Consequences:** ✅ marketing ↔ wizard continuity across clients ❌ true anonymous drafts / provider-pinning in DB remain Phase B in `CUSTOMER-HOME-ORDER-FLOW.md`.

## ADR-0055 — Public catalog tiles by category (+ optional subtree) for guest wizard
**Date:** 2026-05-02 **Status:** Accepted
**Context:** Flutter (and web) order entry must let guests pick a **ServiceCatalog** from taxonomy without calling provider-scoped listing APIs. `GET /api/service-catalog/by-category/:categoryId` previously required `authenticate`, blocking guest flows and encouraging clients to infer a catalog id from the first marketplace **Service** row (which incorrectly pins a provider context).
**Decision:** Make `GET /api/service-catalog/by-category/:categoryId` a **public** read-only list of active catalogs. Support optional `?deep=1` so one request can return catalogs attached to the category **or any descendant** (used when the UI offers a single “main category” root). `GET /api/service-catalog/:id/schema` stays authenticated.
**Consequences:** ✅ guest-safe catalog discovery aligned with taxonomy ❌ listing is metadata-only (no pricing); abuse surface is low-volume read.

## ADR-0053 — Pre-match read for contracts list + payment status (invited workspace)
**Date:** 2026-04-28 **Status:** Accepted
**Context:** `routes/orderContracts.ts` returned `403`/`400` for invited inbox workspaces before `Order.matchedProviderId` was set, while `orderChat.ts` already exposed read-only thread access (ADR-0052). Flutter showed error banners and empty contract/payment panels for legitimate inbox states.
**Decision:** Introduce `lib/orderNegotiationAccess.ts` with `userHasActiveInboxAttemptForOrder` (shared with `orderChat.ts`). `resolveParticipantRole` gains `invited_provider`. `GET /api/orders/:orderId/contracts` and `GET .../contracts/context` return **200** with `readOnly: true`, `code: CONTRACTS_LOCKED_UNTIL_MATCHED`, and `lockReason` (no contract bodies for pre-match). Mutations stay `403` with `CONTRACTS_READ_ONLY_UNTIL_MATCHED` where applicable. `GET /api/orders/:orderId/payments/status` returns **200** for the same audience with `readOnly: true`, `code: PAYMENT_CUSTOMER_AFTER_CONTRACT`, and explanatory `lockReason` (no payment secrets); session/confirm remain customer/staff-only.
**Consequences:** ✅ Flutter can render gated copy without treating expected states as hard failures ❌ invited users still cannot draft/pay until match + contract rules (ADR-0048).

## ADR-0056 — Public `GET /api/service-catalog/:id` for wizard pricing snapshot
**Date:** 2026-05-03 **Status:** Accepted
**Context:** The order wizard review step needs a guest-safe, read-only estimate (lowest active `ProviderServicePackage.finalPrice` plus BOM line snapshots) without exposing authenticated schema payloads.
**Decision:** Add `GET /api/service-catalog/:id` (registered after `/:id/schema` in `routes/serviceCatalog.ts`) returning catalog id/name plus optional `price` and `bom.lines` derived from the cheapest active package for that catalog; inactive catalogs return `404`.
**Consequences:** ✅ review UI can show marketplace-style estimates for guests ❌ reflects one representative package, not full marketplace pricing.

## ADR-0057 — Contract templates: explicit placeholders + same versioned workflow
**Date:** 2026-05-05 **Status:** Accepted
**Context:** F8 needs predictable, non-magical starting points for `ContractVersion` drafts before optional AI or future DB-managed catalogs.
**Decision:** Ship a **code-defined** template registry (`lib/contractTemplateCatalog.ts`) whose Markdown uses `{{camelCase}}` tokens replaced from order + chat context (`lib/renderContractTemplate.ts`). `POST /api/orders/:orderId/contracts/draft-from-template` creates a normal **draft** row with `generatedByAi=false`, `generationPrompt` set to `template:<templateId>`, and `generationContext` storing `{ templateId, templateVersion, placeholderKeys }`. Listing uses `GET .../contracts/templates`. Lifecycle (send / approve / reject / supersede) is unchanged.
**Consequences:** ✅ auditable, AI-ready structure ❌ template prose changes require a deploy until a separate admin/DB layer exists.

## ADR-0058 — `JobRecord` extends `Order` without renaming lifecycle core
**Date:** 2026-05-05 **Status:** Accepted
**Context:** `Order` already spans offer/order/job lifecycle states, but Sprint N needs a traceable offer-to-job chain with analytics-ready job metrics while preserving backward compatibility.
**Decision:** Keep `Order` as the canonical lifecycle entity and add `Order.broadcastList` plus a 1:1 `JobRecord` (`orderId @unique`, relation `OrderJob`) to hold operational job timestamps, cancellation metadata, and analytics fields (`responseTimeMinutes`, `priceDelta`, `customerRating`) with `JobStatus`.
**Consequences:** ✅ additive migration with minimal API break risk ❌ job-level reporting now joins across `Order` and `JobRecord` until dedicated read models exist.

## ADR-0059 — Web direction: `frontend/` greenfield shell vs root `src/` SPA
**Date:** 2026-05-13 **Status:** Accepted
**Context:** The repository ships two React+Vite web surfaces: the root SPA (`index.html` → `src/main.tsx`, `npm run dev`) and a separate app under `frontend/` (README: `cd frontend && npm run dev`). `docs/ROADMAP.md` Phase 0 calls for scaffolding the new shell alongside the existing backend; `docs/ui.txt` specifies provider/company IA for the new UX.
**Decision:** Treat **`frontend/`** as the **default target** for new web IA and provider UX alignment with `docs/ui.txt` and Phase 0+. Keep **`src/`** as the **continuing legacy + admin + broader feature** bundle until a future ADR explicitly migrates routes or deprecates the root SPA.
**Consequences:** ✅ agents have a single written default when choosing where to add net-new web UX ❌ temporary duplication of web effort across two bundles until cutover.

## ADR-0060 — Client surfaces: Flutter and web are both first-class
**Date:** 2026-05-13 **Status:** Accepted
**Context:** `flutter_project/` and web clients all consume `/api/*`. The roadmap defers specific Flutter scope (for example order-wizard parity) while still listing Flutter parity as a cross-cutting goal.
**Decision:** **Both** Flutter and web are **first-class** product surfaces. Prefer **`frontend/`** for new web shell work per ADR-0059; do **not** treat Flutter as secondary to web or vice versa in planning—coordinate API contracts across bundles. Roadmap deferrals describe **schedule**, not **deprecation** of a client.
**Consequences:** ✅ avoids false either/or prioritization in documentation ❌ requires discipline to keep API behavior backward-compatible for multiple clients.
