# Neighborly 2.0 — Customer Dashboard Features

> **Dashboard for:** Regular customers (role: `customer`)  
> **Bottom Nav:** 3 tabs — HOME, EXPLORER, SERVICES  
> **4th Tab:** MY BUSINESS — appears only after business KYC approval

---

## Global Layout Rules

### Header (All Customer Pages)
- Top-left: NeighborHub logo (Home icon + text) — tap to go to Home
- Desktop nav links: Home, Explore, Orders, Business
- Notification bell with red dot for unread count
- User avatar (top-right) — tap to open Profile
- Sign-in button shown when not authenticated

### Color Theme (Dark)
- Background: `#0d0f1a`
- Cards/Surfaces: `#1e2235`
- Primary Blue: `#2b6eff`
- Business Orange: `#ff7a2b`
- Success Green: `#0FC98A`
- Text: white/light gray
- Borders: `#2a2f4a`

### Email Uniqueness — CRITICAL SECURITY RULE
- One email = one account. `normalizedEmail` is unique at DB level.
- Registration normalizes email to lowercase before checking uniqueness.
- Google OAuth: if email already exists with password auth, link accounts.

### PII Protection — CORE SYSTEM RULE
- No phone numbers or emails may be shared between users.
- Chat system scans all messages for PII before delivery.
- Blocked messages show warning to sender only.
- Violations are logged for admin review.

---

## BOTTOM NAVIGATION — 3 Tabs

```
HOME (Tab 1)
├── Home (sub-tab) — default landing
├── My Posts (sub-tab)
└── Profile (accessed via avatar in header)

EXPLORER (Tab 2)
├── General (sub-tab) — personal content
└── Business (sub-tab) — business content

SERVICES (Tab 3)
├── Overview (sub-tab) — stats
├── Orders (sub-tab) — active + completed
└── Messages (sub-tab) — chat hub
```

---

## TAB 1 — HOME

### HOME / HOME (Sub-tab 1 — Default Landing)

**Neighbourhood Banner** (top of page):
- Weather card: current temperature, condition icon, location name
- Traffic alerts: road closures, accidents nearby
- Police alerts: safety notifications for the area
- Dismissible banner — user can hide it

**Utility Icons Row** (horizontal scrollable row):
- Banks
- Insurance
- Fuel/Gas stations
- Government services
- Hospitals
- Pharmacies
- Schools
- Each icon: category icon + label, tap to open utility link

**Search Box** (large, prominent — 20%+ of screen height):
- Centered on page
- Placeholder: "Search for a service, provider, or post..."
- On focus: shows recent searches + trending categories
- On submit: navigates to search results page

**Local News & Events Feed**:
- Cards with image, title, date, category
- Sourced from admin-curated utility links
- Paginated infinite scroll

---

### HOME / MY POSTS (Sub-tab 2)

Three inner sections:

**Posts**:
- Grid of user's published posts (photo/video thumbnails)
- Each post: thumbnail, caption preview, like count, comment count
- Tap to view full post
- Create new post button (FAB)

**Stories**:
- Horizontal scroll of user's active stories
- Each story: circular thumbnail, time remaining indicator
- Tap to view story
- Create new story button

**Saved**:
- Grid of saved/bookmarked posts
- Same layout as Posts section
- Unsave option on tap

---

### HOME / PROFILE (Accessed via avatar in header)

**Profile Card**:
- Avatar (large, circular)
- Display name
- Email (masked for PII — show only first/last chars)
- Phone (masked)
- Bio
- Location
- Member since date

**KYC Status Section**:
- Current KYC level badge
- Level 0: email + phone verified
- Level 1: government ID verified
- Level 2: business documents verified
- Upgrade button if next level available

**Saved Addresses**:
- List of saved locations with tags: home, work, favourite, custom
- Each address: label, street, city, province, map pin icon
- Add new address button
- Edit/delete existing addresses
- Default address indicator

**Account Settings**:
- Edit profile (name, bio, phone, avatar)
- Change password
- Notification preferences
- Privacy settings
- Delete account (with confirmation)

**Become a Business**:
- Prominent CTA card
- "Register My Business" button
- Triggers Business KYC upgrade flow
- Only shown if current KYC is Level 0 or Level 1

---

## TAB 2 — EXPLORER

### EXPLORER / GENERAL (Sub-tab 1)

**Stories Row** (top, horizontal scroll):
- Circular story avatars from followed users and businesses
- "Your Story" as first item (tap to create)
- Live/active indicator ring
- Tap to view story

**Post Feed** (infinite scroll below stories):
- Cards with: author avatar + name, category badge, media (photo/video), caption, action bar
- Action bar: Like button with count, Comment button with count, Share button, Save button, Order button
- Like: heart icon, animated on tap
- Comment: tap to expand inline comment section
- Share: copy link or share to platform
- Save: bookmark icon toggle
- Order: opens service detail or order wizard (for business posts)
- Category filter chips at top: All, Trending, Recent, Following

**Content Creation FAB**:
- Floating action button (bottom-right)
- Options: New Post, New Story
- Camera/gallery access for media upload
- Category selection is mandatory for all posts

---

### EXPLORER / BUSINESS (Sub-tab 2)

**Stories Row** (same as General but only business accounts):
- Business story circles with logo/brand avatar
- Verified badge on verified businesses

**Business Post Feed**:
- Same card layout as General
- Additional: "Order Now" CTA on service-related posts
- Verified badge next to business name
- Trust score indicator

**Category Filter**:
- Filter by service category
- Filter by location/distance
- Sort by: rating, distance, newest

---

## TAB 3 — SERVICES (Regular Customer)

### SERVICES / OVERVIEW (Default sub-tab)

**Stats Cards** (filterable by date range, service type, provider, staff):
| Card | Data |
|------|------|
| Orders Placed | Total count + total amount spent |
| Orders Completed | Count + total amount paid |
| Orders Cancelled | Count + any refunds issued |
| Active Orders | Count (tap to jump to active list) |

Filters:
- Date range: from/to date picker
- Service category
- Provider name
- Staff member name

---

### SERVICES / ORDERS (Sub-tab)

**Active Orders**:
- All current orders in pipeline
- One card per order: service name, provider, status badge, date, amount
- Status stages: Pending → Matched → Contracted → Active → Completed
- Cancelled orders in collapsible section below active
- Tap card → Order Detail page with 3 tabs: Details, Contract, Chat
- Cancel button visible if within cancellation window

**Completed Jobs** (history table):
| Column | Data |
|--------|------|
| Date and Time | When job was performed |
| Service | Service name and category |
| Provider | Business name |
| Staff | Person who performed work |
| Agreed Amount | Price negotiated or fixed |
| Amount Paid | Confirmed payment amount |
| Actions | Print Invoice, Rate and Review |

Filters: date range, provider name, service type, staff member

---

### SERVICES / MESSAGES (Sub-tab — THE CORE OF THE PLATFORM)

This is the heart of the application. All negotiation, agreement, and coordination happens here.
No external contact information is ever shared. This rule is absolute.

**Inbox Layout**:

Conversation List (left panel desktop, full screen mobile):
- One row per order-related conversation
- Each row: provider avatar, business name, service name, last message snippet, time, unread count badge
- Tabs at top:
  - Active (ongoing negotiations and active jobs)
  - Offers (matched providers awaiting customer response)
  - History (concluded conversations)

Chat Thread (right panel desktop, full screen mobile after tap):
- Full message history for selected conversation
- Provider profile photo visible at top (identity confirmation)
- Messages scanned for PII before delivery — blocked messages show warning
- Message input box at bottom

**Persistent Action Buttons** (always visible below input):
- "I have reached an agreement" — triggers contract generation flow
- Attach file or photo (job-related documents only)
- Request update (sends automated nudge to provider)

**Contract Generation Flow**:
1. Customer taps agreement button
2. System prompt: "Describe the final agreement. Include service, date, time, price, requirements."
3. Customer types summary
4. AI reads full chat history + summary → generates contract draft
5. Contract displayed for customer review
6. Customer sends contract to provider
7. Provider accepts or proposes changes
8. On acceptance → Stripe payment link sent to customer
9. Customer pays → funds held in escrow
10. On job completion → funds released minus platform commission

---

## TAB 4 — MY BUSINESS (appears only after business KYC approval)

Tap this tab → navigates to Business Dashboard.
- Personal profile avatar remains in top-right corner
- Company logo appears in top-left with hamburger menu below it

---

## BECOME A BUSINESS — KYC UPGRADE FLOW

Triggered from profile "Register My Business" button.

**Step 1 — Business Type Selection**:
- Sole Proprietor (individual under personal brand)
- Corporation or Partnership (company with employees)

**Step 2 — License Requirement Check**:
- System checks service category against license-required list
- If required → upload license document
- If not → marked as "General Service — No License Required"
- Status displayed publicly on business profile

**Step 3 — Insurance Check** (Corporations only):
- Does business carry liability insurance?
- Upload certificate of insurance
- Insurance status on business profile
- Contributes to trust score

**Step 4 — Document Submission**:
- Government ID of owner
- Business registration certificate (corporations)
- License document (if applicable)
- Insurance certificate (if applicable)

**Step 5 — Admin Review**:
- Goes to admin KYC queue
- Email + in-app notification on approval/rejection
- On approval → MY BUSINESS tab becomes visible

**Trust Score Calculation**:
- KYC identity verified: base score
- Professional license verified: additional points
- Liability insurance verified: additional points
- Average customer rating: weighted contribution
- Trust score determines search ranking and matching priority

---

## NOTIFICATION ROUTING

| Event | Routes To |
|-------|-----------|
| Order matched | Services tab > Messages |
| New offer received | Business Messages > Active tab |
| Contract sent | Messages > relevant conversation |
| Contract approved | Messages > relevant conversation |
| Payment link ready | Order Detail page |
| Order completed | Messages history |
| KYC approved | Profile or Business setup |
| KYC rejected | Profile with reason |
| PII blocked in chat | In-chat warning inline |
