# Neighborly 2.0 — Business Dashboard Features

> **Dashboard for:** Business owners, solo providers, and employees (roles: `provider`, `staff`, `owner`)  
> **Bottom Nav:** 3 tabs — DASHBOARD, MY BUSINESS, MESSAGES  
> **Hamburger Menu:** Finance, Social Media Manager  
> **Header:** Company logo (left) + Personal avatar (right)

---

## Global Layout Rules

### Header
- Top-left: Company logo — tap to open business profile management panel
- Below logo: Hamburger menu icon for full navigation
- Top-right: Personal profile avatar (always present — access to personal account)

### Switch to Personal Account
- In hamburger menu: "Go to Personal Account"
- Returns user to personal feed without logging out of business account

### Color Theme (Dark — same as Customer)
- Background: `#0d0f1a`
- Cards/Surfaces: `#1e2235`
- Primary Blue: `#2b6eff`
- Business Orange: `#ff7a2b`
- Success Green: `#0FC98A`

### PII Protection — CORE SYSTEM RULE
- Same rules as Customer dashboard
- No phone numbers or emails shared between users
- Chat system scans all messages for PII before delivery

---

## BUSINESS BOTTOM NAVIGATION — 3 Tabs

```
DASHBOARD (Tab 1 — Default)
├── Stats cards
├── Performance cards
├── AI Insights panel

MY BUSINESS (Tab 2)
├── Services
├── Packages
├── Inventory / Shop

MESSAGES (Tab 3)
├── Active (offers requiring response)
├── History (lost + accepted deals)
├── Completed Orders (full table)
```

---

## BUSINESS TAB 1 — DASHBOARD (Default)

### Stats Cards (filterable by date range, service type, package type)

| Card | Data |
|------|------|
| Active Services | Currently in-progress jobs count |
| Pending | Awaiting provider acceptance |
| Completed | Total finished jobs |
| Revenue Received | Total amount received from all clients |
| Platform Commission | Total commission deducted |

### Performance Cards
- Best-selling service (by number of orders)
- Lowest-performing service
- Successful orders total
- Failed or lost orders total

### AI Insights Panel (bottom of dashboard page)
- Analysis of why specific orders were lost to competitors
- What other providers in the same category do differently
- Suggested improvements: pricing, availability windows, package structure
- V2: deeper analytics, trend-based recommendations, demand forecasting

---

## BUSINESS TAB 2 — MY BUSINESS

### Services (Sub-tab 1)
- List of service definitions linked to this workspace
- Each service shows: name, category, booking mode (Fixed / Negotiable / Auto-appointment), status
- Add, edit, archive services
- Each service links to its dynamic field schema managed by admin in service catalog

### Packages (Sub-tab 2)
- List of configured service packages
- Each package: name, price, booking mode, Bill of Materials items, margin display
- Toggle auto-appointment on or off per package
- Admin can lock booking mode at category level — business cannot override a locked mode

### Inventory / Shop (Sub-tab 3)
- Products and parts list with: name, price per unit, stock quantity, unit of measure
- Assign products to package Bills of Materials
- Set stock alert threshold (optional)
- Price at time of order is snapshotted and immutable — historical orders always show correct prices

---

## BUSINESS TAB 3 — MESSAGES AND NOTIFICATIONS

Same PII-protection rules apply. No external contact information may be shared.

### Active (Default — must load first and fast)
- Incoming order offers requiring response
- Unread count badge on tab visible at all times
- Each offer card: customer info, service requested, proposed date/time, initial message
- Actions per offer: Accept, Decline, Counter-offer, Open Chat
- Expiry countdown per offer — auto-expires if no response within configured window
- Lost-deal feedback prompt shown after expiry or decline

### History
- Lost deals: declined or expired offers
- Accepted deals: converted to active orders

### Completed Orders (full table)

| Column | Data |
|--------|------|
| Client | Name and profile photo |
| Package Sold | Package name with BOM breakdown on expand |
| Staff Assigned | Employee who performed the service |
| Amount Charged | Total billed to client |
| Commission | Platform fee deducted |
| Payment Reference | Transaction hash from payment provider |
| Date and Time | Job completion timestamp |
| Actions | Print Invoice, Email Invoice to Client |

---

## HAMBURGER MENU — Business Side Navigation

### 1. FINANCE

**Tab 1 — Transactions Table**:
Spreadsheet-style table:
- Columns: Date, Service/Package, Client, Staff, Amount, Commission, Net Amount, Payment Reference, Status
- Running total row pinned at top for current filter
- Filter controls: date range, service type, package name, client name, staff member
- Per-row actions: Print Invoice, Email Invoice to Client

**Tab 2 — Payment Gateway Setup**:
Before redirecting to payment provider, show preparation checklist:
- Government ID (already in KYC)
- Business registration certificate (already in KYC)
- Bank account routing number and account number
- Tax identification number

Show brief tutorial: "This takes approximately 5 minutes. Your documents are already on file."

**Primary: Connect to Stripe**
- Opens Stripe Connect OAuth flow
- System pre-fills business data from existing KYC documents
- On Stripe approval → workspace marked `payoutsEnabled`
- Commission split configured in Stripe: platform fee auto-deducted

**Additional Payment Methods** (adapter pattern):
| Method | Description |
|--------|-------------|
| Stripe Connect | Primary — auto commission split, instant OAuth setup |
| PayPal Business | Commission via PayPal Commerce Platform split payments |
| Interac e-Transfer | Canada only — manual admin verification, commission invoiced separately |
| Square | For businesses with physical Square POS |

For every payment method: platform commission is always calculated and collected.

---

### 2. SOCIAL MEDIA MANAGER

**Posts**:
- All published posts in a list: thumbnail, category, likes, comments, date published
- Edit caption or update category on existing posts
- Archive post (soft-delete)
- Schedule post: set future publish date and time

**Stories**:
- All stories published: active vs expired status
- Create new story: photo or video, max 24 hours duration

**Respond to Comments and Messages**:
- Comment notifications from posts appear here
- Direct message inquiries from Explorer
- All replies stay on-platform — no external contact information exchanged

**Social Media Access Control**:
- Only business owner can grant employees access to this section
- Role: `SOCIAL_MEDIA_MANAGER` — can create/edit posts, respond to comments and DMs
- Only owner can add or remove this role assignment
- Multiple employees can hold this role simultaneously

---

## STAFF MANAGEMENT

### Employee Roles
| Role | Permissions |
|------|-------------|
| `handyman` | Can perform services, view assigned orders |
| `finance` | Can view transactions, generate invoices |
| `adv` | Can manage social media, create posts |
| `career` | Can manage job postings |
| `task_manager` | Can assign and manage tasks |
| `internal_manager` | Full operational access |
| `hr` | Can manage staff profiles |

### Workspace Switching
- User can work for multiple businesses
- Workspace switcher in header/hamburger menu
- Each workspace has its own dashboard, services, packages, and messages
- Notifications show which workspace they belong to

---

## NOTIFICATION ROUTING

| Event | Routes To |
|-------|-----------|
| New offer received | Business Messages > Active tab |
| Contract sent | Messages > relevant conversation |
| Contract approved | Messages > relevant conversation |
| Payment received | Finance tab |
| Order completed | Messages history |
| New social comment | Social Media Manager |
| New post direct message | Social Media Manager |
| KYC approved | Profile or Business setup |
| KYC rejected | Profile with reason |
