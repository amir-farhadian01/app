# Create Order wizard — manual QA checklist (web + Flutter)

Use this list after changes to Home → Order navigation, Step 1 layout, or catalog APIs.  
Check each box when verified on a **staging** build with a populated category tree.

**References:** `docs/CUSTOMER-HOME-ORDER-FLOW.md`, ADR-0054, ADR-0055.

---

## A. Category-only entry (must NOT imply a provider)

- [ ] **Web:** From Home, tap a **category chip** (e.g. Plumbing). URL includes `homeCategory` and does **not** add `prefillProviderId` unless you tapped a listing/banner card.
- [ ] **Web:** Wizard Step 1 shows category tree opened to the resolved branch; **no** forced provider picker before you choose a catalog.
- [ ] **Flutter:** From Home, tap a **category icon**. `Create Order` opens with **main category** pre-selected; **service type** dropdown is **not** auto-filled from the first marketplace listing.
- [ ] **Flutter:** Optional `prefillProviderId` chip/copy appears **only** when the deep link included `prefillProviderId` (banner / card flows), not for category-only taps.

---

## B. Banner / listing entry (category + provider hint)

- [ ] **Web:** From a **popular service** or **top provider** card (or banner CTA that encodes a service), URL includes `serviceCatalogId`, `homeCategory`, and `prefillProviderId` where applicable.
- [ ] **Flutter:** Same deep link opens with **service type** pre-filled when `serviceCatalogId` is present; provider disclaimer visible when `prefillProviderId` is present.

---

## C. “New offer” (+)

- [ ] **Web:** New offer opens wizard with empty tree root / `newOffer` helper copy; **Other** path available.
- [ ] **Flutter:** New offer shows helper copy; **main category** starts empty; user must pick category + service type (or use **Suggest** / **Other**).

---

## D. Flutter Step 1 layout (parity with web intent)

- [ ] **Describe** field (multi-line) is **above** **Service selection** (not below the catalog control).
- [ ] **Suggest service type from text** runs on description text and fills or narrows **service type** when search returns hits.
- [ ] **Main category** is a **dropdown** of taxonomy roots from `GET /api/categories/tree`.
- [ ] **Service type** is a **dropdown** of catalogs from `GET /api/service-catalog/by-category/:rootId?deep=1` (guest-safe; no JWT required).

---

## E. Guest vs auth

- [ ] **Web:** Logged-out user can open `/orders/new` and interact with Step 1; first **draft create** or **submit** prompts sign-in with return path.
- [ ] **Flutter:** Same behavior: order submit / draft failure with 401 routes to auth without losing the overall flow expectation.

---

## F. API / backend (regression)

- [ ] `GET /api/service-catalog/by-category/:categoryId` returns **200** without `Authorization` (public list).
- [ ] With `?deep=1`, response includes catalogs attached to **descendant** categories of the given root (smoke-test one deep tree).
- [ ] `GET /api/service-catalog/:id/schema` still requires auth (unchanged).

---

## G. Copy / edge cases

- [ ] Unknown `homeCategory` slug shows a non-blocking note; user can still pick **main category** manually.
- [ ] Category with **no** active catalogs shows an empty-state message (Flutter) or equivalent empty tree behavior (web).
