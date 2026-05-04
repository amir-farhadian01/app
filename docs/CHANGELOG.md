# Changelog

## Unreleased

### Added

- Order wizard Step 4: resilient service questionnaire — `snapshotSchemaForOrder` uses `minimalFallbackQuestionnaire()` when catalog JSON is missing/invalid; residential painting seed ships full `PAINTING_RESIDENTIAL_QUESTIONNAIRE`; wizard prefetches schema on tile press (signed-in), merges answers when schema upgrades, and shows actionable copy instead of blocking on empty schema.
- Order wizard Step 2: booking-mode branching (`auto_appointment`, `inherit_from_catalog`, `negotiation`) via Zustand (`src/lib/wizardStore.ts`), `Step2BookingForm` + `booking/*` form variants; catalog tiles expose `lockedBookingMode` on `GET /api/service-catalog/by-category/:id`; review step and submit append booking preferences to the order description.
- Prisma seed: `ServiceCatalog` entries (haircut, residential painting, Toyota oil change, maintenance bundle), inventory `Product` rows for Sample Provider and Barber Sample Provider workspaces, `ProviderServicePackage` rows with BOM (`ProductInPackage`) covering `auto_appointment`, `inherit_from_catalog`, and `negotiation` booking modes, plus a promotional maintenance bundle (list 80 vs BOM snapshot total 99).
- `GET /api/products` — authenticated list of products for the user’s default workspace (`User.companyId`) or `?workspaceId=` with membership check.
