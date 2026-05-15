# Neighborly 2.0 — Admin Dashboard Features

> **Dashboard for:** Platform administrators (roles: `platform_admin`, `support`, `finance`, `developer`)  
> **Layout:** Sidebar navigation + top bar + main content area  
> **Port:** 9090 (admin-specific API port)

---

## Global Layout Rules

### Layout
- Left sidebar with navigation sections
- Top bar: platform logo, search, admin avatar with dropdown
- Main content area: full-width page for each section
- Dark theme matching customer/business dashboards

### Admin Roles
| Role | Access |
|------|--------|
| `platform_admin` | Full access to all sections |
| `support` | Users, KYC, Orders, Contracts, Chat Moderation |
| `finance` | Payments, Transactions, Commission reports |
| `developer` | System config, Logs, Integrations |

---

## SIDEBAR NAVIGATION

### Section 1 — Overview
- Dashboard (default landing)
- Analytics
- Zone Map

### Section 2 — Users
- All Users
- Businesses
- Verification Queue (KYC)
- Reports

### Section 3 — Content
- Broadcast
- Ads
- Events
- News

### Section 4 — Settings
- System Configuration
- Commission Rates
- Integration Settings

---

## SECTION 1: OVERVIEW

### Dashboard (Default Landing)

**Stats Cards** (top row):
| Card | Data |
|------|------|
| Total Users | Count with growth % |
| Business Accounts | Count with growth % |
| Active Zones | Count |
| Posts Today | Count |
| Open Reports | Count with urgency indicator |

**Charts**:
- User growth over time (line chart)
- Revenue by period (bar chart)
- Order volume by category (pie chart)
- KYC approval rate (funnel chart)

**Recent Activity Feed**:
- Latest user registrations
- Latest KYC submissions
- Latest disputes
- Latest payments

---

## SECTION 2: USERS

### All Users

**User CRM Table** (full-featured):
| Column | Data |
|--------|------|
| Name | Display name + avatar |
| Email | Masked for PII |
| Phone | Masked |
| Role | Badge |
| KYC Level | Level 0/1/2 badge |
| Status | Active / Suspended / Pending |
| Joined | Date |
| Actions | View, Edit, Suspend, Delete |

Features:
- Search by name, email, phone
- Filter by role, KYC level, status, date range
- Sort by any column
- Export to CSV
- Bulk actions: suspend, verify, message

**User Detail Panel** (slide-out drawer):
- Full user profile
- KYC submission history
- Order history
- Transaction history
- Login activity log
- Notes (admin-only)

### Businesses

**Business Table**:
| Column | Data |
|--------|------|
| Business Name | Name + logo |
| Owner | Name |
| Type | Sole Proprietor / Corporation |
| KYC Status | Badge |
| Trust Score | Numeric score |
| Active Services | Count |
| Total Revenue | Amount |
| Actions | View, Verify, Flag |

Features:
- Filter by KYC status, business type, trust score range
- Search by business name, owner name
- View business detail with all services, packages, staff

### Verification Queue (KYC)

**KYC Review Queue**:
- List of pending KYC submissions
- Each submission: user info, documents, AI analysis verdict
- Actions: Approve, Reject, Request Resubmission
- AI Verdict Card: shows Gemini AI analysis results
- Image Lightbox: view uploaded documents full-size
- Review Action Bar: approve/reject with notes

**KYC Levels**:
| Level | Requirements |
|-------|-------------|
| Level 0 | Email + phone verification |
| Level 1 | Government ID + selfie |
| Level 2 | Business docs + license + insurance |

### Reports
- User reports and flags
- Content moderation reports
- Dispute reports

---

## SECTION 3: CONTENT

### Media Audit

**Media Asset Table**:
| Column | Data |
|--------|------|
| Thumbnail | Image/video preview |
| Uploader | User name |
| Type | Photo / Video |
| Size | File size |
| Moderation Status | PENDING / APPROVED / REMOVED / WARNED |
| Views | Count |
| Flags | Count |
| Uploaded | Date |
| Actions | Approve, Remove, Warn, Escalate |

Features:
- Filter by moderation status, uploader type (personal/business), category, date range, flag count
- Bulk moderation for flagged content
- View engagement metrics per asset

### Utility Links Manager

**Utility Links Table**:
| Column | Data |
|--------|------|
| Title | Link name |
| URL | Target URL |
| Category | BANK / INSURANCE / FUEL / GOVERNMENT / OTHER |
| Commission Rate | % |
| Click Count | Total clicks |
| Status | Active / Archived |
| Actions | Edit, Archive, View Clicks |

Features:
- Add new utility link with title, URL, category, icon, commission rate
- Edit existing links
- Archive/unarchive links
- Per-link click analytics: total clicks, unique users, revenue from referrals
- Category management: add new utility categories

### Broadcast
- Send push notifications to all users or filtered segments
- Schedule broadcast delivery
- View broadcast history

### Ads
- Manage platform advertisements
- Ad placement configuration
- Ad revenue tracking

### Events
- Create and manage platform events
- Event calendar view
- Event attendance tracking

### News
- Create and manage news articles
- News feed configuration
- Featured/pinned articles

---

## SECTION 4: SETTINGS

### System Configuration
- Tax rate configuration
- Commission rate configuration
- Default credit limit
- Payment methods enabled/disabled
- Integration settings (Stripe, PayPal, etc.)
- Monitoring URLs
- Theme configuration
- Dependency catalog (admin-editable)

### Business Trust Score Management
- Admin view of trust scores for all businesses
- Manual adjustment of individual score factors
- Override license or insurance verification status with notes
- Flag business for re-review

### Stripe Connect Overview
- List of all connected workspaces with connection status
- Total commission received per period
- Failed payouts and disputes requiring admin attention
- Manual commission entry for non-Stripe payment methods

### Form Builder (KYC per business type)
- Visual drag-and-drop form builder
- Different form schema per business category
- Field types: text, textarea, number, currency, date, datetime, file upload, select, multiselect, boolean, location, phone, email
- Conditional logic: show/hide fields based on values
- Schema versioning: old submissions linked to schema snapshot
- Preview mode before publishing

---

## EXISTING ADMIN CAPABILITIES (Already Built in `src/`)

These features are fully implemented in the old `src/` frontend and need to be ported to the new `frontend/`:

### Order Management
- Orders table with filters (status, date, category, provider)
- Order detail drawer with all order info
- Order status management
- Cancel/dispute resolution

### Contract Review Queue
- Contracts pending admin review
- Contract detail with version history
- Approve/reject/override contract
- Internal notes on contracts

### Chat Moderation
- Chat message log with moderation status
- Filter by: clean, masked, blocked, flagged
- Message detail drawer
- User chat history view

### Payments Ledger
- All transactions table
- Payment detail drawer
- Commission tracking
- Refund processing

### Service Definitions
- Category tree with drag-and-drop reordering
- Service definition editor with dynamic field schema
- Preview as customer
- Booking mode configuration
- Category-level booking mode lock

### Service Packages (Admin View)
- Global packages table
- Package detail drawer
- Cross-workspace package comparison

### Inventory (Admin View)
- Global products table
- Product detail drawer
- Cross-workspace inventory view

---

## NOTIFICATION ROUTING

| Event | Routes To |
|-------|-----------|
| New user registration | Users > All Users |
| New KYC submission | Users > Verification Queue |
| New dispute | Orders > Disputes |
| New chat flag | Content > Chat Moderation |
| Payment failure | Settings > Stripe Connect |
| Media flagged | Content > Media Audit |
