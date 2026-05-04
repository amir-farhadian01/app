# Admin parity tracker

Single source for “every user-facing feature has an admin counterpart.”
Update this file in the same PR as the feature.

| Feature shipped to user | Admin counterpart needed | Admin status |
|-------------------------|--------------------------|--------------|
| KYC submission (F3) | KYC review queues + audit | ✅ via F2 |
| Service type definitions (F0) | Admin editor for catalog questionnaire | ✅ (Service Definitions tab) |
| Customer cabin (F4) | Admin user impersonation | ⏳ planned |
| Customer Account → Safety hub / preferences / trusted contacts (Flutter UI) | No dedicated admin surface; support uses existing user and order tooling | ✅ n/a |
| Order wizard (F5) | Admin Orders panel | ✅ |
| Customer order confirmation route `/orders/:id/confirmation` (post-submit summary) | No new admin surface; order detail/list unchanged | ✅ n/a |
| Order phases visible end-to-end | Admin Offers/Orders/Jobs segments + Customer My Orders segments | ✅ |
| Auto-match (Sprint I) | Admin eligibility view + match override | ✅ |
| Round-robin invites + customer provider selection (Sprint J) | Admin order detail matching view shows attempts/eligibility context for support decisions | ✅ |
| Round-robin (window operations) | Admin live state + extend window + start round-robin | ✅ |
| Provider service packages (Sprint F) | `lockedBookingMode` in service editor + global Provider Packages; force-archive | ✅ |
| Workspace Inventory → Admin global Inventory view | `GET /api/admin/products` (+ package BOM on admin service-package detail) | ✅ |
| Provider inventory quick list (same data as workspace products) | `GET /api/products` (optional `workspaceId`); admin continues to use `/api/admin/products` | ✅ n/a |
| Chat (F7) | Moderation + PII inbox | ✅ (Platform → **Chat Moderation** + `/api/admin/chat/flags` + review/escalate/note) |
| Provider Flutter: workspace orders list + packages/inventory/company routes | No new admin surface (display/API reuse only); admin visibility unchanged | ✅ n/a |
| Contracts (F8) | Templates + dispute (deferred); **contract queue + overrides** (Platform → **Contracts**, `GET /api/admin/contracts/queue`, detail drawer, mark-reviewed / internal note / override-supersede) | ✅ Sprint L queue |
| Payments gate/session (Sprint M) | Admin payments ledger + per-row detail (`GET /api/admin/payments/ledger`, `GET /api/admin/payments/ledger/:transactionId`, Finance tab) + audit visibility (`PAYMENT_SESSION_CREATED`, `PAYMENT_CAPTURED`) | ✅ minimal |
| Lost-deal analytics + provider scorecards (F9) | Lost-deal explorer + provider scorecard report | ⏳ deferred post-Flutter |
| Bulletin (F10) | Authoring + schedule | ⏳ deferred post-Flutter |

**Note:** F3 user-side flows are ✅ in `ROADMAP.md`; admin review is tracked
under F2 (✅ for drift-checked admin module).

**Deferred modules reopening gate (F9/F10):**
1. Flutter parity for F5–F8 is accepted (feature + API parity sign-off).
2. Core transactional domains (orders/matching/chat/contracts/payments) run one sprint without open P0/P1 backend defects.
3. Analytics/event data contracts are finalized for admin reporting surfaces.
