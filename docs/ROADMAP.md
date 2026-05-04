# Neighborly — Project Roadmap (Living Manifest)
**Last regenerated:** 2026-04-27 (Sprint M — payment gate/session + customer/admin payment visibility) · **Last commit:** unknown
**Status legend:** ✅ done · 🚧 in-progress · ⏳ planned · ❓ unverified · ⚠ drift

> ⚠ THIS FILE IS THE SOURCE OF TRUTH.
> Every Cursor agent in every chat MUST read this file BEFORE writing any
> code. If you (the agent) are reading this, stop and run
> `npm run docs:check` first to detect drift.

## How this file stays alive
1. Every PR that ships a phase change MUST update the matching phase row.
2. `npm run docs:check` runs the same evidence checks Step A used and prints
   diffs vs the recorded status. If diffs exist, CI fails.
3. docs/AGENTS.md and docs/CLAUDE.md include a banner pointing here.
4. Cursor rule `.cursor/rules/roadmap-first.mdc` injects this file into every
   new agent context.

## Repository language (manifest)
All human-readable text in this repository—including **code comments**, shell
and CI log messages, workflow-generated PR bodies, config labels, and inline
technical notes—**must be written in English only**. Do not use Persian
(Farsi) or other non-English natural language anywhere in the tree, including
inside comments. Default user-facing API/UI copy stays English until a formal
i18n system owns localized strings.

## Runtime responsiveness (manifest)
The application must not freeze or become unresponsive during user actions.
Any gated action (auth, navigation, network mutation) must fail gracefully with
non-blocking feedback, and recovery paths must always keep navigation usable.

## Drift detected (doc vs code)
- None (docs/AGENTS.md stack bullets aligned 2026-04-24; see **ADR-0009** in
  `/docs/DECISIONS.md`).

## Phase matrix (Customer · Provider · Admin tracked together)

### F0 — Categories & Service Definitions
- **Goal:** Hierarchical (≤5 levels) category tree + per-service dynamic
  field schema (the schema later powers the Order Wizard's dynamic
  questions).
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ⏳ | ⏳ | ✅ |
- **Evidence (auto-discovered):** `routes/categories.ts` with `GET /tree`
  and `GET /tree-with-services` (one round-trip nested tree + per-leaf
  `ServiceCatalog` lite + `sortOrder` / `archivedAt`; max depth 5;
  `includeArchived` admin-only); `lib/categoryServiceTreeView.ts` +
  `lib/categoryTreeOps.ts`; `routes/adminCategoriesTree.ts` under
  `/api/admin/categories-tree` in `server.ts` (reorder, archive, create);
  Prisma `Category` + `ServiceCatalog` carry `sortOrder` and `archivedAt` with
  `(parentId|categoryId, sortOrder)` indexes; `ServiceCatalog` has
  `categoryId` → `Category`, `dynamicFieldsSchema` Json, `defaultMatchingMode`,
  `isActive`, `slug`, `lockedBookingMode` (Sprint F); `GET /api/admin/service-definitions` (paginated) +
  `DELETE` with `owner|platform_admin`; public
  `GET /api/service-catalog/:id/schema` (`authenticate`); `lib/serviceDefinitionTypes.ts` +
  `lib/serviceQuestionnaireValidate.ts`; admin **Service Definitions** tab
  (`src/components/admin/serviceDefinitions/*`, `src/services/adminServiceDefinitions.ts`
  + `src/pages/AdminDashboard.tsx` tab `service-definitions`) + **Provider Packages**
  sub-tab `service-packages` (`src/components/admin/servicePackages/*`, `src/services/adminServicePackages.ts`).
  `ServiceTree` in `src/components/admin/serviceDefinitions/tree/`
  (DnD, search, `adminCategoryTree.ts`); **Categories** sidebar sub-tab removed
  (taxonomy only via **Service Definitions**). **Provider packages (Sprint
  F, backend in this prompt):** Prisma `ProviderServicePackage` + `BookingMode`,
  `ServiceCatalog.lockedBookingMode`, migration `f_workspaces_packages`;
  `lib/workspaceAccess.ts` (`assertWorkspaceMember`, `listMyWorkspaces`);
  `GET/POST/PUT/DELETE` `/api/workspaces/*` + `/api/workspaces/:id/service-packages*`
  in `routes/workspaces.ts` (auth `authenticate`); admin
  `routes/adminServicePackages.ts` on `/api/admin/service-packages` + admin
  service-definition `lockedBookingMode` + conflict `409` in
  `routes/adminServiceDefinitions.ts`. **Sprint G — inventory:** Provider packages
  now carry a Bill of Materials with stable price snapshots (`ProductInPackage`);
  `routes/adminProducts.ts` on `/api/admin/products` (global read list + detail +
  `usedInPackages`); admin **Inventory** sub-tab (`src/components/admin/inventory/*`,
  `src/services/adminProducts.ts`, `inventory` in `AdminDashboard`); admin package
  detail `GET /api/admin/service-packages/:id` includes BOM lines + computed margin.
- **Done definition:** Category model has parentId; admin UI lets editors
  add up to 5 levels; ~~service model carries `dynamicFieldsSchema`~~ ✓
  `ServiceCatalog.dynamicFieldsSchema`; ~~public read for wizard~~ ✓
  `GET /api/service-catalog/:id/schema`; ~~drag-drop tree across ≤5 levels with
  sort persistence~~ ✓ (API + `ServiceTree` + `adminCategoryTree`); Categories
  tab removed; tree is canonical; seeded data covers ≥3 top-level
  categories.
- **Drift checks (commands):**
    test -f routes/categories.ts
    grep -q "^model Category" prisma/schema.prisma
    grep -q "parentId" prisma/schema.prisma
    grep -q "sortOrder" prisma/schema.prisma
    grep -q "archivedAt" prisma/schema.prisma
    grep -q "^model ServiceCatalog" prisma/schema.prisma
    grep -q "dynamicFieldsSchema" prisma/schema.prisma
    grep -q "/tree" routes/categories.ts
    grep -q "tree-with-services" routes/categories.ts
    test -f lib/categoryServiceTreeView.ts
    test -f lib/categoryTreeOps.ts
    test -f routes/adminCategoriesTree.ts
    grep -q "categories-tree" server.ts
    test -f routes/adminServiceDefinitions.ts
    test -f routes/serviceCatalog.ts
    test -f lib/serviceDefinitionTypes.ts
    test -f lib/serviceQuestionnaireValidate.ts
    grep -q "service-definitions" server.ts
    test -f src/components/admin/serviceDefinitions/AdminServiceDefinitionsSection.tsx
    test -f src/components/admin/serviceDefinitions/tree/ServiceTree.tsx
    test -f src/services/adminCategoryTree.ts
    test -f src/services/adminServiceDefinitions.ts
    grep -q "ServiceTree" src/components/admin/serviceDefinitions/AdminServiceDefinitionsSection.tsx
    grep -q "service-definitions" src/pages/AdminDashboard.tsx
    test -f src/components/admin/servicePackages/AdminServicePackagesSection.tsx
    test -f src/services/adminServicePackages.ts
    grep -q "service-packages" src/pages/AdminDashboard.tsx
    test -f routes/adminProducts.ts
    grep -q "admin/products" server.ts
    test -f src/services/adminProducts.ts
    test -f src/components/admin/inventory/AdminInventorySection.tsx
    grep -q "inventory" src/pages/AdminDashboard.tsx
    grep -q "inventory" src/lib/adminTab.ts
- **Last verified:** 2026-04-25 via `npm run docs:check` + Sprint G PROMPT 3
    (lint, docs, stack, backend curl, FE checklist)
- **Open prompts:** none

### F1 — Admin: Users module (CrmTable + segments + side panel)
- **Goal:** CRM-style admin user grid with pagination, segments, sorting, and
  side detail panel.
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ⏳ | ⏳ | 🚧 |
- **Evidence (auto-discovered):** `src/components/crm/CrmTable.tsx` exists;
  `src/services/adminUsers.ts` exists; `GET /api/admin/users` delegates to
  `getAdminUsersList` in `lib/adminUsersList.ts` which implements `page`,
  `pageSize`, `sortBy`, `segment` (query params not duplicated as literals
  throughout `routes/admin.ts`).
- **Done definition:** Admin users UX complete (segments, bulk, export,
  panel) and documented; any new list params reflected here and in checks.
- **Drift checks (commands):**
    test -f src/components/crm/CrmTable.tsx
    test -f src/services/adminUsers.ts
    test -f lib/adminUsersList.ts
    grep -q "pageSize" lib/adminUsersList.ts
    grep -q "sortBy" lib/adminUsersList.ts
    grep -q "segment" lib/adminUsersList.ts
    grep -q "getAdminUsersList" lib/adminUsersList.ts
- **Last verified:** 2026-04-24 via `npm run docs:check`
- **Open prompts:** none

### F2 — Admin: KYC (Levels 0/1/2 + Form Builder)
- **Goal:** Admin review queues, Level 0/1/2 flows, and business form builder.
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ⏳ | ⏳ | ✅ |
- **Evidence (auto-discovered):** `routes/adminKyc.ts` with `authenticate`,
  `isAdmin`; Prisma models `KycPersonalSubmission`, `BusinessKycFormSchema`,
  `KycLevel0Profile`; `src/components/admin/kyc/AdminKycSection.tsx` and
  `formBuilder/FormBuilder.tsx` present.
- **Done definition:** All review actions audited; form schema versioning
  enforced end-to-end; admin UX parity with submission types.
- **Drift checks (commands):**
    test -f routes/adminKyc.ts
    grep -q "model KycPersonalSubmission" prisma/schema.prisma
    grep -q "model BusinessKycFormSchema" prisma/schema.prisma
    grep -q "model KycLevel0Profile" prisma/schema.prisma
    test -f src/components/admin/kyc/AdminKycSection.tsx
- **Last verified:** 2026-04-24 via `npm run docs:check`
- **Open prompts:** none

### F3 — Customer & Provider KYC submission flows
- **Goal:** Web wizards for personal and business KYC against `/api/kyc/v2`.
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ✅ | ✅ | ⏳ |
- **Evidence (auto-discovered):** `server.ts` mounts `app.use("/api/kyc/v2",
  kycUserRoutes)`; `routes/kycUser.ts` exists; NATS `publish('kyc.personal.submitted'`
  / `kyc.business.submitted` in that route file; `PersonalKycWizard.tsx` and
  `BusinessKycFlow.tsx` present under `src/components/kyc/`.
- **Done definition:** Mobile parity (Flutter), resubmit flows, and admin
  linkage fully signed off.
- **Drift checks (commands):**
    grep -q "/api/kyc/v2" server.ts
    test -f routes/kycUser.ts
    test -f src/components/kyc/personal/PersonalKycWizard.tsx
    test -f src/components/kyc/business/BusinessKycFlow.tsx
- **Last verified:** 2026-04-24 via `npm run docs:check`
- **Open prompts:** none

### F4 — Flutter customer cabin rebuild (4-tab nav + tabbed Account)
- **Goal:** Customer Flutter shell: four bottom destinations, no center FAB;
  customer home without a horizontal top tab strip; profile can stay tabbed.
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ✅ | ✅ | ⏳ |
- **Evidence (auto-discovered):** `neighborly_shell.dart` (customer) nav is
  four `_NavItem` entries (Home on `/`, AI, Explorer, Account on `/profile`); for
  `role == 'provider'` the shell uses the same four bottom destinations with
  Home on `/dashboard` (see `neighborly_shell.dart` ~60–65); no
  `FloatingActionButton` in
  `neighborly_shell.dart`. `customer_dashboard_screen.dart` has no `TabBar(`.
  `ProviderDashboardScreen` has its own in-screen `NavigationBar` (work tabs)
  and a contextual FAB for services; that is a workspace layout **inside** the
  shared shell, not a second global bottom nav.
- **Done definition:** Provider/mobile parity verified; any role-specific
  regressions covered by checks.
- **Drift checks (commands):**
    grep -q "_NavItem('Home', '/'," flutter_project/lib/widgets/neighborly_shell.dart
    ! grep -q "FloatingActionButton" flutter_project/lib/widgets/neighborly_shell.dart
    ! grep -q "TabBar(" flutter_project/lib/screens/customer_dashboard_screen.dart
- **Last verified:** 2026-04-24 via `npm run docs:check`
- **Open prompts:** none

### F5 — Order Wizard MVP (3 entry points → 1 wizard, dynamic fields)
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ✅ | ✅ | ✅ |
- **Evidence (auto-discovered):** Prisma `Order`, `OrderStatus`, `OrderEntryPoint`, `OrderReview`;
  customer `routes/orders.ts` (`/api/orders`: draft upsert, autosave, submit with
  `validateServiceAnswers` + `snapshotSchemaForOrder`, cancel, `GET /me`, `GET /:id`,
  provider `POST /:id/complete`, customer `POST /:id/review` → `OrderStatus.closed` + NATS `orders.reviewed`);
  `GET /api/categories/search`; `GET /api/service-catalog/by-category/:categoryId`;
  public `GET /api/service-catalog/:id` (pricing/BOM snapshot for `Step3Review`);
  public `GET /api/service-catalog/:id/packages` (wizard package cards + BOM margin);
  customer `GET /api/orders/:id/matched-providers` (draft provider preview) + `POST /api/orders/:id/submit` (wizard finalize; `PUT /api/orders/draft/:id` accepts `customerPicks` for autosave restore);
  admin `routes/adminOrders.ts` (`/api/admin/orders`: list w/ facets, `GET /:id`,
  stats, platform cancel); `lib/orderSnapshot.ts`, `lib/adminOrdersList.ts`,
  `lib/orderPhotosForValidate.ts`, `lib/categoryBreadcrumbs.ts`; NATS
  `orders.submitted`; `lib/bus.ts` `startNatsNotificationConsumers` writes customer
  `Notification` rows on `orders.matched` (published with `orders.auto_matched` from
  `lib/matching/orchestrator.ts`), `orders.completed`, and `contracts.approved`
  (`lib/orderLifecycleNotifications.ts`); `AuditLog` `ORDER_SUBMITTED` / `ORDER_CANCELLED` /
  `ADMIN_CANCELLED_ORDER`. **Customer:**   `src/components/orders/*` (wizard,
  steps including `Step6Description` / `Step7Review`, `DynamicFieldRenderer`, AI coach, photos), `src/services/orders.ts`,
  `/orders/:id/confirmation` post-submit summary route,
  `src/lib/orderDescriptionAi.ts`, `src/pages/MyOrders.tsx` (pipeline cards: provider block + ratings + cancel/rate actions + tab empty states),
  `src/pages/OrderDetail.tsx` (Details / Contract / Chat tabs; dispute POST `/api/orders/:id/dispute`; contract review modal via `ContractPanel`),
  routes `/orders`, `/orders/new`, `/orders/:id` in `src/App.tsx`; entry wiring
  `ServiceDetails` (“Book this service”), `CustomerDashboard` (Book a service),
  `CustomerHome` → `/orders/new` deep links (`homeCategory`, `prefillProviderId`, `newOffer`),
  guest wizard without mount redirect to `/auth` (sign-in at submit via `returnTo` query). **Admin UI:**
  `src/components/admin/orders/*` (`AdminOrdersSection`, `OrdersTable`, `OrderDetailDrawer`),
  `src/services/adminOrders.ts`, Orders tab + **Overview** live KPIs in `src/pages/AdminDashboard.tsx`
  (`GET /api/admin/stats`, `GET /api/admin/stats/orders-trend`, `GET /api/admin/audit-log` via `lib/adminOverviewStats.ts` + `routes/admin.ts`).
  **Sprint I append:** submit `matchOutcome` + matched summaries in `routes/orders.ts`,
  provider Inbox UI (`src/components/provider/inbox/*`, `src/services/providerInbox.ts`;
  `InboxDetailDrawer` + `InboxDrawerChat` for full offer detail + order-scoped chat via `routes/orderChat.ts`;
  workspace inbox list/detail returns `customerPicks` + package `bom` for BOM lines), and
  admin matching tab/eligibility/override wiring in order drawer + API.
- **Done definition:** Single wizard; dynamic fields from service schema;
  admin order panel per ADMIN-PARITY; Phase segments shipped (Offers / Orders /
  Jobs / Cancelled + lifecycle filters).
- **Drift checks (commands):**
    grep -q "^model Order" prisma/schema.prisma
    grep -q "OrderStatus" prisma/schema.prisma
    test -f routes/orders.ts
    test -f routes/adminOrders.ts
    grep -q "'/search'" routes/categories.ts
    grep -q "by-category" routes/serviceCatalog.ts
    grep -q "public lite read for wizard review" routes/serviceCatalog.ts
    test -f src/components/orders/Step3Review.tsx
    test -f flutter_project/lib/order/step2_booking_form.dart
    test -f lib/orderSnapshot.ts
    test -f lib/adminOrdersList.ts
    grep -q "/api/orders" server.ts
    grep -q "/api/admin/orders" server.ts
    test -f src/components/orders/OrderWizard.tsx
    grep -q "/orders/new" src/App.tsx
    test -f src/pages/MyOrders.tsx
    test -f src/pages/OrderDetail.tsx
    grep -q "^model OrderReview" prisma/schema.prisma
    grep -q "orders.reviewed" routes/orders.ts
    test -f src/components/admin/orders/AdminOrdersSection.tsx
    test -f src/components/admin/orders/OrdersTable.tsx
    test -f src/components/admin/orders/OrderDetailDrawer.tsx
    test -f src/services/adminOrders.ts
    grep -q "AdminOrdersSection" src/pages/AdminDashboard.tsx
    test -f lib/adminOverviewStats.ts
    grep -q "computeAdminOverviewStats" routes/admin.ts
    grep -q "/stats/orders-trend" routes/admin.ts
    grep -q "audit-log" routes/admin.ts
- **Last verified:** 2026-05-04 via `npm run docs:check` + customer order wizard steps 3–7 + provider inbox drawer (detail + chat) + lint
- **Open prompts:** ⏳ Flutter port of the order wizard (partial: `CreateOrderWizardScreen` + `HomeScreen` deep links).

### F6 — Matching engine MVP (auto_book vs round_robin_5)
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ✅ | ✅ | ✅ |
- **Evidence (auto-discovered):** Prisma `OfferMatchAttempt` + `MatchAttemptStatus`,
  `Order.matched*` and `autoMatchExhausted`; matching libs
  `lib/matching/eligibility.ts` + `lib/matching/orchestrator.ts`; submit wiring in
  `routes/orders.ts`; provider inbox + acknowledge/decline/rematch in `routes/workspaces.ts`;
  admin `GET /eligibility` + `POST /match-override` in `routes/adminOrders.ts`; provider
  inbox UI (`src/components/provider/inbox/*`); customer matched UX in
  `ConfirmationView` / `OrderDetail` / `MyOrders`; admin matching tab in
  `src/components/admin/orders/OrderDetailDrawer.tsx`. **Sprint J provider UX:** inbox segments now include Awaiting/Acknowledged/Declined/Lost, drawer supports invited accept flow with expiry countdown, and optional lost-feedback panel (`LostFeedbackPanel.tsx`) for superseded/declined/expired outcomes.
- **Done definition:** Policies implemented; admin editor + why-not-matched
  logs.
- **Drift checks (commands):**
    test -f prisma/schema.prisma
- **Last verified:** 2026-04-25 via `npm run docs:check`
- **Open prompts:** none

### F7 — In-platform Chat (with PII guard) + AI Translation layer
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ✅ | ✅ | ✅ |
- **Evidence (auto-discovered):** `routes/orderChat.ts` mounted at
  `/api/orders/:orderId/chat` with participant-gated thread/message endpoints;
  **Sprint F7b (2026-04-28):** pre-match **read-only** chat for invited workspace
  members (`invited_provider` role + `readOnly` on `GET .../chat/thread`);
  `POST`/`translate` return `403` + `CHAT_READ_ONLY_UNTIL_MATCHED` until match;
  `400` bodies may include `code: NO_MATCHED_PROVIDER`; Flutter provider
  workspace drawer + `/workspace/*` routes + `GET /api/orders/provider/me`
  for pipeline orders (see **ADR-0052**).
  `routes/adminChat.ts` mounted at `/api/admin/chat` with `GET /flags` plus
  `POST /flags/:id/review`, `POST /flags/:id/escalate`, `POST /flags/:id/note`;
  Prisma `OrderChatThread` / `OrderChatMessage` + enums `ChatMessageType` /
  `ChatModerationStatus`; `lib/chatModeration.ts` server-side masking/flagging;
  `lib/chatTranslate.ts` translation wrapper with graceful keyless fallback;
  customer/provider `OrderChatPanel` + admin **Chat Moderation** tab
  (`src/components/admin/chatModeration/*`, `src/services/adminChatModeration.ts`).
- **Done definition:** Moderation queue, PII inbox, translation cost dash.
- **Drift checks (commands):**
    test -f prisma/schema.prisma
    test -f routes/orderChat.ts
    test -f routes/adminChat.ts
    test -f lib/chatModeration.ts
    test -f lib/chatTranslate.ts
    test -f src/components/admin/chatModeration/AdminChatModerationSection.tsx
    test -f src/components/admin/chatModeration/ModerationTable.tsx
    test -f src/components/admin/chatModeration/ModerationDrawer.tsx
    test -f src/services/adminChatModeration.ts
    grep -q "chat-moderation" src/lib/adminTab.ts
    grep -q AdminChatModerationSection src/pages/AdminDashboard.tsx
- **Last verified:** 2026-04-25 via `npm run docs:check` + Sprint K admin moderation UI
- **Open prompts:** none

### F8 — Contracts (AI draft from chat) + Payments link
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | 🚧 | 🚧 | ✅ |
- **Evidence (auto-discovered):** `routes/contracts.ts`, `Contract` model,
  `routes/transactions.ts`; **Sprint L:** `routes/orderContracts.ts`, `routes/adminContracts.ts`,
  `lib/contractDraft.ts`, `lib/contractMismatchGuard.ts`, `lib/contractEvents.ts`,
  `lib/orderPayments.ts`,
  Prisma `OrderContract` / `ContractVersion` / `ContractEvent` + enums; NATS
  `contracts.sent` / `contracts.approved` / `contracts.rejected`; web `ContractPanel` +
  `src/services/orderContracts.ts`; admin **Contracts** tab (`AdminContractsSection`,
  `ContractsTable`, `ContractDetailDrawer`, `src/services/adminContracts.ts`: queue wired to
  `GET /api/admin/contracts/queue`, table columns + status badges, filters status/order ID,
  drawer with formatted contract body, version sent-by history, payment gate badges,
  `POST .../reviewed` + `mark-reviewed`, `POST .../note` + `internal-note`, override-supersede + confirm).
  **Sprint M:** payment gate/session via
  `routes/orderPayments.ts` (`POST /api/orders/:orderId/payments/session` returns
  `409 { code: CONTRACT_APPROVAL_REQUIRED }` unless order is contracted from the approved
  contract version), customer order detail payment status (`routes/orders.ts` + `OrderDetail`),
  admin payment ledger/detail (`routes/adminPayments.ts` — `GET /api/admin/payments` paginated,
  `GET /api/admin/payments/orders/:orderId`, `GET /api/admin/payments/ledger`, `GET /api/admin/payments/ledger/:transactionId`),
  **Payments** tab (`AdminPaymentsSection`, `PaymentDetailDrawer`, `src/services/adminPayments.ts`, `tab=payments` in `AdminDashboard.tsx`),
  and audit actions `PAYMENT_SESSION_CREATED` / `PAYMENT_CAPTURED`.
  **Deferred:** templates/disputes expansion + settlement automation.
- **Done definition:** Templates, disputes, payment ledger in admin (remaining); Sprint L contract loop shipped; Sprint M payment gate/session + minimal admin ledger shipped.
- **Drift checks (commands):**
    test -f prisma/schema.prisma
    test -f routes/orderContracts.ts
    test -f routes/adminContracts.ts
    test -f lib/contractDraft.ts
    test -f lib/contractMismatchGuard.ts
    test -f lib/contractEvents.ts
    test -f src/components/admin/contracts/AdminContractsSection.tsx
- **Last verified:** 2026-05-04 via `npm run docs:check` + admin Contracts UI completion + admin Payments UI (ledger table + detail drawer; Stripe deferred)
- **Open prompts:** F8 templates/dispute queue + settlement automation depth.

### F9 — Lost-deal analytics + provider scorecards
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ⏳ | ⏳ | ⏳ |
- **Phase timing:** **Deferred post-Flutter parity** (do not schedule before Flutter parity sign-off for F5–F8 APIs and screens).
- **Rationale:** F9 is analytics/reporting depth, while current critical path is feature parity and operational stability for core transaction loops (orders, matching, chat, contracts, payments) across web + Flutter.
- **Reopen gate (all required):**
  1. Flutter parity for F5–F8 accepted by product/QA.
  2. No P0/P1 backend defects open in orders/matching/chat/contracts/payments for one full sprint.
  3. Analytics data contracts finalized for `OfferMatchAttempt` loss reasons + payment/contract joins.
- **Evidence (auto-discovered):** not found in this pass.
- **Done definition:** Lost-deal explorer; provider scorecard report.
- **Drift checks (commands):**
    test -f prisma/schema.prisma
- **Last verified:** 2026-04-24 via `npm run docs:check`
- **Open prompts:** none

### F10 — Weekly bulletin + market-trend insights (data-science output)
- **Status:**
  | Customer | Provider | Admin |
  |----------|----------|-------|
  | ⏳ | ⏳ | ⏳ |
- **Phase timing:** **Deferred post-Flutter parity** (follows F9 reopening, not in current parity sprint scope).
- **Rationale:** F10 depends on stable cross-channel event quality and mature analytics outputs; it should start only after Flutter parity removes delivery risk from core transactional features.
- **Reopen gate (all required):**
  1. F9 reopened and scoped with approved metrics dictionary.
  2. Admin capacity allocated for bulletin authoring + scheduling UX.
  3. Data freshness/quality SLO defined for trend inputs.
- **Evidence (auto-discovered):** not found in this pass.
- **Done definition:** Bulletin authoring + scheduling in admin.
- **Drift checks (commands):**
    test -f prisma/schema.prisma
- **Last verified:** 2026-04-24 via `npm run docs:check`
- **Open prompts:** none

For F5..F10, the Customer/Provider/Admin column for Admin is "Admin must
gain a corresponding panel in the same release":
  F5 → Admin: order list + filter by status, force-cancel, see dynamic answers
  F6 → Admin: matching policy editor + see why-not-matched logs
  F7 → Admin: chat moderation queue + PII-leak inbox + translation cost dash
  F8 → Admin: contract templates + dispute queue + payment ledger
  F9 → Admin: lost-deal explorer; provider scorecard report (**deferred post-Flutter**)
  F10 → Admin: bulletin authoring + scheduling (**deferred post-Flutter**)

This "Admin parity" column ensures the admin side never falls behind.

## Cross-cutting tracks (run in parallel with F0..F10)
- **Workspaces** — ✅ (Company = workspace; **provider UI:** `WorkspaceContext`,
  `WorkspaceSwitcher` on `CompanyDashboard`, `My Packages` tab +
  `src/components/provider/packages/*` + `src/services/workspaces.ts`; **admin:** global
  **Provider Packages** tab, booking lock in `ServiceDefinitionEditor`, `lockedBookingMode` in API).
- **Inventory (Phase 1)** — ✅ (Prisma `Product` + `ProductInPackage` BOM snapshots, migration
  `g_inventory_bom`; `lib/packageMargin.ts`; provider CRUD + BOM under `routes/workspaces.ts`;
  admin read `routes/adminProducts.ts` + BOM/margin on `routes/adminServicePackages.ts` `GET /:id`;
  **provider UI:** `CompanyDashboard` tab `inventory`, `src/components/provider/inventory/*`,
  BOM in `PackageEditorDrawer` + `PackageBomSection.tsx`, `src/services/inventory.ts`,
  `PackagesTable` BOM/margin columns; **admin:** Services → **Inventory** global table +
  read-only product drawer + package detail cost breakdown).
- **Lifecycle UI** — ✅ (`OrderPhase` + `lib/orderPhase.ts`; admin Orders segments; customer
  `MyOrders` segments + `facets.phase` on `GET /api/orders/me`; ADR-0033–0035 in `DECISIONS.md`).
- **Matching Engine (Phase 1 - auto + Phase 2 - round-robin)** — ✅ (auto-match orchestration, provider inbox flows,
  round-robin negotiation invites, lazy expiry + replacement, customer winner selection, and lost-deal feedback capture shipped through Sprint J).
- **Chat + PII + translation (Sprint K scope)** — ✅ (order-scoped threads/messages, server `lib/chatModeration.ts`,
  optional `lib/chatTranslate.ts`, web chat UI + admin **Chat Moderation** queue; ADR-0043–0046.)
- **Contract loop (draft → send → approve/reject)** — ✅ (Sprint L: versioned `ContractVersion`,
  provider/customer `OrderDetail` **Contract** tab, admin **Contracts** queue + mark-reviewed / internal note /
  override-supersede; `GET /api/admin/contracts/queue` + detail; ADR-0047–0051.)
- **Security & RBAC** — JWT + `lib/auth.middleware.ts` / `lib/auth.ts`;
  `UserRole` enum in Prisma; audit via `AuditLog` model (not Firestore).
- **Observability** — logs, metrics, tracing
- **i18n & RTL** — currently English + Farsi RTL partial
- **Accessibility** — minimum 48dp tap targets, contrast, screen-reader labels
- **Mobile (Flutter) parity** — tracked separately under F4 + each F* feature

## Glossary index → see /docs/GLOSSARY.md
## Architecture index → see /docs/ARCHITECTURE.md
## Decisions log → see /docs/DECISIONS.md
## Admin parity tracker → see /docs/ADMIN-PARITY.md
## Reusable prompts → see /docs/PROMPT-LIBRARY.md
