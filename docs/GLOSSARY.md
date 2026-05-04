# Glossary (domain nouns)

Alphabetical short definitions grounded in this repo’s code and docs.

- **AuditLog** — Prisma model storing `action`, `resourceType`, `resourceId`,
  optional `metadata` JSON for compliance review.
- **Auto-book** — Planned matching mode (F6); not implemented in source as of
  roadmap pass.
- **Bulletin** — Planned weekly market digest (F10); not present in schema.
- **BusinessKycFormSchema** — Versioned JSON form definition (`version` unique)
  driving provider business KYC.
- **Category** — Hierarchical catalog node with optional `parentId` and
  self-relation `children`.
- **Chat** — User messages (`ChatMessage`) tied to `ChatRoom` in Prisma; HTTP
  routes under `/api/chat`.
- **Company** — Provider organization profile; links to `User` owner and
  optional `businessKycSubmissions`.
- **Contract** — Financial/legal record between `customerId` and `providerId`,
  optional `requestId`, signing booleans, `status` string.
- **OrderContract** — One shell per `Order` (`orderId` unique) linking `ContractVersion`
  rows and `ContractEvent` audit entries; `currentVersionId` points at the
  customer-approved snapshot when present.
- **ContractVersion** — Immutable snapshot of title/terms/policies/scope/dates/amount
  for one negotiation round; `ContractVersionStatus` drives draft → sent →
  approved | rejected | superseded.
- **Superseded version** — Older `sent` or replaced `draft` row kept for audit but
  no longer actionable as the active proposal.
- **Customer** — `User` with role `customer` (default) using customer dashboards
  and requests.
- **Job** — A confirmed engagement between a customer and a provider; in the
  order lifecycle it maps to `OrderStatus` values `contracted`, `paid`,
  `in_progress`, or `completed` (and the stored `Order.phase` is `job` once
  past matching/negotiation).
- **KYC L0 / L1 / L2** — Level 0: `KycLevel0Profile` contact/address gates;
  Level 1: `KycPersonalSubmission` identity review; Level 2: business KYC via
  `BusinessKycSubmission` + schema.
- **Match** — Planned concept for pairing requests to providers (F6); not a
  dedicated Prisma model today.
- **Offer** — A customer’s submitted request not yet matched with a provider;
  `Order.status` is `submitted` and `Order.phase` is `offer`.
- **Order** — (1) Prisma `Order`: wizard-backed booking with `OrderStatus` and
  optional `Order.phase` (`offer`, `order`, or `job`) from `lib/orderPhase.ts`.
  (2) Lifecycle “order” phase: matched with a provider under negotiation;
  `Order.status` is `matching` or `matched` and `Order.phase` is `order`.
- **OrderChatThread** — Order-scoped chat container for one customer and one
  matched provider; stores thread-level state and links `OrderChatMessage` rows.
- **Masked message** — Chat message whose `displayText` redacts detected contact
  data (email/phone/link/handles) while preserving `originalText` for audit.
- **Flagged message** — Chat message marked for admin review due to explicit
  contact-exchange intent (for example, “contact me on …”).
- **PII guard** — Planned chat safety layer (F7); not verified in code here.
- **Provider** — `User` with role `provider` offering `Service` rows and
  receiving `Request`s.
- **Request** — Customer-initiated booking row linking `customerId`,
  `providerId`, and `serviceId` with `status` string.
- **Round-robin pool** — Planned matching pool (F6); see ADR-0007.
- **Round-robin invitation** — An `OfferMatchAttempt` in `invited` status for
  negotiation-mode matching, with a shared `expiresAt` window and replacement
  from the next eligible provider on decline/expiry.
- **Lost-deal feedback** — Provider-submitted structured reasons (`lostReason`,
  `lostFeedback`) attached to attempts in `superseded` / `declined` /
  `expired` states to improve future matching priorities.
- **Service** — Provider-published offering (`title`, `price`, optional
  `category` string) used by `Request`.
- **ServiceCatalog** — Curated catalog entry with `name`, `category`,
  `subcategory`, `complianceTags` (distinct from per-provider `Service`).
- **ServiceDefinition** — Roadmap term for future dynamic field schema per
  service; not a Prisma model name today (`ServiceCatalog` / `Service` exist).
- **Workspace** — Informal term for a company operating context; closest entity
  is `Company` plus `CompanyUser` memberships.
