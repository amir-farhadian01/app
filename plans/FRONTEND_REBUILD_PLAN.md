# Frontend Rebuild Plan — Dark Theme & UI Alignment

## Problem Statement

The previous Code agent implemented the 6 Business Dashboard pages correctly (dark theme, proper API integration), but **used the old `src/` React code as reference** instead of the new UI design specified in [`files/FEATURES.md`](files/FEATURES.md) and the prototype file at `/home/amir/prototypes/saved_resource.html`. This resulted in:

1. **Explore.tsx** — Empty placeholder (`<div>Explore</div>`), should have two-tab layout (General + Business)
2. **CustomerDashboard.tsx** — Uses old light-theme classes (`bg-white`, `text-gray-900`, `border-gray-200`) instead of dark theme
3. **MyOrders.tsx** — Uses old light-theme classes (`bg-white`, `text-gray-900`, `border-blue-600`)
4. **OrderDetail.tsx** — Uses old light-theme classes (`bg-white`, `text-gray-900`, `border-gray-300`)
5. **Messages.tsx** — Empty placeholder (`<div>Messages</div>`)
6. **AdminDashboard.tsx** — Empty placeholder (`<div>AdminDashboard</div>`)

## Design System Reference

### Dark Theme Colors (from [`frontend/tailwind.config.ts`](frontend/tailwind.config.ts))

These match the prototype CSS variables exactly:

| Tailwind Token | Hex | Prototype CSS Var | Usage |
|---|---|---|---|
| `app-bg` | `#0d0f1a` | `--bg` | Page background |
| `app-bg-2` | `#131624` | `--bg2` | Card/section background |
| `app-bg-3` | `#1a1d2e` | `--bg3` | Elevated surfaces |
| `app-card` | `#1e2235` | `--card` | Card backgrounds |
| `app-card-2` | `#242840` | `--card2` | Elevated cards |
| `app-text` | `#f0f2ff` | `--text` | Primary text |
| `app-text-2` | `#8b90b0` | `--text2` | Secondary text |
| `app-text-3` | `#4a4f70` | `--text3` | Tertiary/muted text |
| `app-border` | `#2a2f4a` | `--border` | Borders |
| `app-border-2` | `#363b5e` | `--border2` | Stronger borders |
| `app-input` | `#1a1d2e` | — | Input backgrounds |
| `app-primary` | `#2b6eff` | `--primary` | Primary actions |
| `app-primary-dim` | `#1a3f99` | `--primary-dim` | Muted primary |
| `app-secondary` | `#0fc98a` | `--secondary` | Success/positive |
| `app-accent` | `#ff7a2b` | `--accent` | Accent/highlight |
| `app-warn` | `#ffb800` | `--warn` | Warning |
| `app-red` | `#ff4d4d` | `--red` | Error/danger |
| `app-purple` | `#8b5cf6` | `--purple` | Purple accent |

### CSS Base (from [`frontend/src/index.css`](frontend/src/index.css))

```css
body { @apply bg-[#0d0f1a] text-[#f0f2ff] antialiased; }
* { @apply border-[#2a2f4a]; }
```

### Fonts

- **DM Sans** — Body text (primary font)
- **Space Grotesk** — Headings, numbers, prices

## Prototype Reference

The prototype file at `/home/amir/prototypes/saved_resource.html` contains 5 phone screens showing the exact UI design. Key patterns:

### Phone 1: Auth/Onboarding
- Phone number input with Canadian flag
- OTP verification (6 boxes)
- Username selection with availability check
- **Not in scope for this rebuild** (auth pages are separate)

### Phone 2: Home Screen
- Header with location "Vaughan, ON" and greeting "Good morning, Amir 👋"
- Week photo card with weather pill and alert pill
- Search box with 5 categories (Building, Auto, Beauty, Transport, Health)
- Public & Government Services chips (TD Bank, RBC, Credit Score, Insurance, ServiceOntario, OHIP)
- Local News feed with colored dots
- Local Events cards (Craft Festival, Concert Night, Auto Expo)
- Interaction Score card (2,840 pts, 3.2 km reach, progress bar)
- Bottom nav: Home, Social, Account (3 tabs)

### Phone 3: Social Explorer (CRITICAL for Explore.tsx)
- **Two tabs**: "Explorer" and "Business Hub"
- Search bar with location filter "📍 ON"
- Stories row with gradient rings (AutoFix, BeautyX, GreenBuild, FoodHub, TaxPros)
- Post cards with:
  - Avatar + username + category + timestamp
  - **Price overlay** on image (e.g., "Full Service Package – $69")
  - "🛒 Order Now" button on image
  - Action bar: Like (heart), Comment (bubble), Share (share icon)
- Business Hub tab shows verified business content with price tags

### Phone 4: Business Profile
- Cover image with gradient overlay
- Logo + Verified badge
- Stats: ⭐ 4.9 (184 reviews), 🏆 12 yrs active, 📍 Vaughan, ON
- Chips: Insured, Warranty, License
- Package tabs: Packages, Inventory, Reviews, About
- Package cards with accent color strip, tag (Best Seller/Recommended/New), price, "Add to Cart" button
- Custom Package Builder CTA

### Phone 5: Business Dashboard
- **Sidebar menu** (hamburger): My Business, Users & Roles, Services, Calendar & Appointments, Page/Blog/Inventory, My Clients, Offers/Orders/Jobs, Payment Settings, Invoices
- **Stats grid**: Today's Appointments (5), Pending Requests (2), Revenue This Week ($1,240), Avg Rating (4.9⭐)
- **Today's Appointments** list with time, name, service, price, status badges (Confirmed/Pending/Done)
- **Recent Offers & Orders** with price and status
- Bottom nav: Home, Social, Account, Business (4 tabs)

## File Inventory & Status

| # | File | Status | Action |
|---|---|---|---|
| 1 | [`frontend/src/pages/public/Explore.tsx`](frontend/src/pages/public/Explore.tsx) | ❌ Empty placeholder | Full implementation |
| 2 | [`frontend/src/pages/customer/CustomerDashboard.tsx`](frontend/src/pages/customer/CustomerDashboard.tsx) | ⚠️ Wrong styles | Dark theme migration |
| 3 | [`frontend/src/pages/customer/MyOrders.tsx`](frontend/src/pages/customer/MyOrders.tsx) | ⚠️ Wrong styles | Dark theme migration |
| 4 | [`frontend/src/pages/customer/OrderDetail.tsx`](frontend/src/pages/customer/OrderDetail.tsx) | ⚠️ Wrong styles | Dark theme migration |
| 5 | [`frontend/src/pages/customer/Messages.tsx`](frontend/src/pages/customer/Messages.tsx) | ❌ Empty placeholder | Full implementation |
| 6 | [`frontend/src/pages/admin/AdminDashboard.tsx`](frontend/src/pages/admin/AdminDashboard.tsx) | ❌ Empty placeholder | Full implementation |

## Phase 1: Explore.tsx — Two-Tab Social Explorer

**Reference**: Prototype Phone 3 + [`files/FEATURES.md`](files/FEATURES.md) lines 143-200

### Tab 1: EXPLORER / GENERAL
- Stories row with gradient rings (fetch from API or mock data)
- Post cards with:
  - Avatar + username + category + timestamp
  - Media/image area with price overlay (if business post)
  - Action bar: Like (heart with count), Comment (bubble with count), Share
  - "🛒 Order Now" CTA on business posts
- Infinite scroll or "Load More" button
- Loading skeleton, error state, empty state

### Tab 2: EXPLORER / BUSINESS
- Same post card layout but filtered to show only verified business content
- Price tags more prominent
- "Book Now" / "Order Now" CTA on every card
- Business profile preview on click

### Implementation Plan

```tsx
// Component structure:
// Explore.tsx
//   ├── SocialTabs (Explorer | Business Hub)
//   ├── SearchBar (with location filter)
//   ├── StoriesRow (gradient rings)
//   ├── PostCard[]
//   │   ├── PostHeader (avatar, username, category, time)
//   │   ├── PostMedia (image/video with price overlay + Order Now btn)
//   │   └── PostActions (like, comment, share)
//   └── BottomNav (Home, Social, Account)
```

### Style Rules for Explore
- Background: `bg-[#131624]` (app-bg-2)
- Cards: `bg-[#1e2235]` (app-card) with `border-[#2a2f4a]` (app-border)
- Text: `text-[#f0f2ff]` (app-text), secondary: `text-[#8b90b0]` (app-text-2)
- Primary button: `bg-[#2b6eff]` (app-primary)
- Active tab: `text-[#2b6eff]` with bottom border `border-[#2b6eff]`
- Price overlay: semi-transparent dark gradient with white text
- Stories ring: gradient border (primary → secondary → accent)

## Phase 2: Customer Pages — Dark Theme Migration

### 2.1 CustomerDashboard.tsx

**Current**: Uses `bg-app-card`, `text-app-text`, `bg-neutral-900`, `bg-white`, `text-gray-900`, `border-gray-200`, `dark:bg-neutral-800/50`

**Target**: Pure dark theme, no light-mode classes, no `dark:` variants

#### Style Migration Rules

| Old Class | Replace With |
|---|---|
| `bg-white` | `bg-[#1e2235]` (app-card) |
| `text-gray-900` | `text-[#f0f2ff]` (app-text) |
| `text-gray-700` | `text-[#8b90b0]` (app-text-2) |
| `text-gray-500` | `text-[#4a4f70]` (app-text-3) |
| `border-gray-200` | `border-[#2a2f4a]` (app-border) |
| `border-gray-300` | `border-[#363b5e]` (app-border-2) |
| `bg-neutral-50/50` | `bg-[#131624]` (app-bg-2) |
| `dark:bg-neutral-800/50` | Remove (base is already dark) |
| `hover:bg-neutral-50/30` | `hover:bg-[#1a1d2e]` (app-bg-3) |
| `shadow-xl` | `shadow-lg shadow-black/20` |
| `rounded-2xl` | Keep (same) |
| `space-y-*` | Keep (same) |

#### Component Structure to Preserve
- Tabs: Overview, My Requests, Spending, Support
- "Become a Provider" modal
- Quick action cards
- Transaction table
- Support tickets

### 2.2 MyOrders.tsx

**Current**: Uses `bg-white`, `text-gray-900`, `border-gray-200`, `border-blue-600`, `bg-blue-50`

**Target**: Pure dark theme

#### Style Migration Rules

Apply the same table from 2.1. Additionally:
- `bg-blue-50` → `bg-[#2b6eff]/10` (primary with 10% opacity)
- `border-blue-600` → `border-[#2b6eff]`
- `text-blue-600` → `text-[#2b6eff]`
- Cancel modal: `bg-white` → `bg-[#1e2235]`

#### Component Structure to Preserve
- Phase tabs: Offers, Active Orders, Completed, Cancelled
- Cancel modal with reason textarea
- Order cards with status badges
- Empty state per tab

### 2.3 OrderDetail.tsx

**Current**: Uses `bg-white`, `text-gray-900`, `border-gray-300`, `bg-gray-50`

**Target**: Pure dark theme

#### Style Migration Rules

Apply the same table from 2.1. Additionally:
- `bg-gray-50` → `bg-[#131624]`
- Dispute modal: `bg-white` → `bg-[#1e2235]`
- Payment button: `bg-blue-600` → `bg-[#2b6eff]`

#### Component Structure to Preserve
- Tabs: Details, Contract, Chat
- Dispute modal with reason selection
- Payment flow
- Contract panel (lazy loaded)
- Chat panel (lazy loaded)

### 2.4 Messages.tsx

**Current**: Empty placeholder `<div>Messages</div>`

**Reference**: [`files/FEATURES.md`](files/FEATURES.md) lines 258-302 (SERVICES / MESSAGES)

#### Implementation Specification
- **Layout**: Split panel — conversation list (left) + active conversation (right)
- **Conversation list**: Avatar + name + last message preview + timestamp + unread badge
- **Active conversation**: Message bubbles (sent/received), text input with send button
- **States**: Loading skeleton, empty state ("No messages yet"), error state
- **Style**: Dark theme consistent with business Inbox.tsx

```tsx
// Component structure:
// Messages.tsx
//   ├── ConversationList
//   │   ├── ConversationCard[] (avatar, name, preview, time, unread dot)
//   │   └── EmptyState / LoadingSkeleton
//   └── ConversationView
//       ├── MessageBubble[] (sent: bg-primary, received: bg-card)
//       ├── TypingIndicator
//       └── MessageInput (textarea + send button)
```

## Phase 3: AdminDashboard — Full Implementation

**Current**: Empty placeholder `<div>AdminDashboard</div>`

**Reference**: [`files/FEATURES.md`](files/FEATURES.md) lines 541-579 (ADMIN PANEL)

### Implementation Specification
- **Stats overview**: Total Users, Active Businesses, Total Orders, Revenue (cards with icons)
- **Recent activity feed**: Latest signups, orders, KYC submissions
- **Quick actions**: View Users, View KYC, View Orders, View Payments
- **Charts/insights**: Simple stat cards (no chart library needed)
- **Style**: Dark theme consistent with business dashboard

```tsx
// Component structure:
// AdminDashboard.tsx
//   ├── Header (title + last updated timestamp)
//   ├── StatsGrid
//   │   ├── StatCard (Users)
//   │   ├── StatCard (Businesses)
//   │   ├── StatCard (Orders)
//   │   └── StatCard (Revenue)
//   ├── RecentActivity
//   │   └── ActivityRow[] (icon, text, timestamp)
//   └── QuickActions
//       └── ActionButton[] (link to admin sub-pages)
```

## Non-Negotiable Rules for Code Agent

1. **DO NOT use `src/` code as reference** — the old React frontend in `src/` uses light theme and is deprecated
2. **USE [`frontend/src/pages/business/`](frontend/src/pages/business/) as style reference** — BusinessDashboard.tsx, Inbox.tsx, Schedule.tsx, Clients.tsx, Finance.tsx, Social.tsx all use correct dark theme
3. **USE [`files/FEATURES.md`](files/FEATURES.md) for UI/UX specifications** — this is the authoritative design document
4. **USE prototype at `/home/amir/prototypes/saved_resource.html` for visual reference** — the 5 phone screens show exact UI patterns
5. **USE Tailwind utility classes only** — no CSS modules, no styled-components, no inline styles (except dynamic values)
6. **All colors MUST use the custom tokens** from [`frontend/tailwind.config.ts`](frontend/tailwind.config.ts): `bg-app-bg`, `text-app-text`, `border-app-border`, etc.
7. **NO light-mode classes** — no `bg-white`, `text-gray-900`, `border-gray-200`, `dark:*` variants
8. **Every component MUST have**: Loading skeleton, error state, empty state
9. **API calls MUST use existing service functions** from the API client layer — do not create new fetch wrappers
10. **TypeScript strict** — no `any`, no `@ts-ignore`, no `// @ts-nocheck`

## Execution Order

```
Phase 1: Explore.tsx (two-tab layout)
  ├── 1.1 Create StoriesRow component
  ├── 1.2 Create PostCard component (with price overlay)
  ├── 1.3 Create SocialTabs component
  ├── 1.4 Implement Explore.tsx with all states
  └── 1.5 Verify against prototype Phone 3

Phase 2: Customer pages (dark theme)
  ├── 2.1 CustomerDashboard.tsx — style migration
  ├── 2.2 MyOrders.tsx — style migration
  ├── 2.3 OrderDetail.tsx — style migration
  └── 2.4 Messages.tsx — full implementation

Phase 3: Admin page
  └── 3.1 AdminDashboard.tsx — full implementation

Final: Verify & commit
  ├── TypeScript compilation check
  ├── Visual check against prototype
  └── Commit with message "fix: align frontend with dark theme design system"
```

## Quality Gates

| Gate | Check |
|---|---|
| TypeScript | `npx tsc --noEmit` passes with zero errors |
| Build | `npm run build` succeeds |
| No light classes | grep for `bg-white`, `text-gray-900`, `border-gray-200` returns zero in modified files |
| No `dark:` variants | grep for `dark:` returns zero in modified files |
| Loading states | Every data-fetching component has skeleton/loading UI |
| Error states | Every API call has error handling with user-facing message |
| Empty states | Every list has empty state with helpful message |

## Completion Checklist

- [ ] Explore.tsx has two tabs: Explorer + Business Hub
- [ ] Explore.tsx has stories row with gradient rings
- [ ] Explore.tsx has post cards with price overlay and action bar
- [ ] Explore.tsx has loading/error/empty states
- [ ] CustomerDashboard.tsx uses only dark theme classes
- [ ] MyOrders.tsx uses only dark theme classes
- [ ] OrderDetail.tsx uses only dark theme classes
- [ ] Messages.tsx has conversation list + active conversation view
- [ ] Messages.tsx has loading/error/empty states
- [ ] AdminDashboard.tsx has stats grid + recent activity + quick actions
- [ ] AdminDashboard.tsx has loading/error/empty states
- [ ] TypeScript compiles with zero errors
- [ ] No light-mode classes remain in modified files
- [ ] All changes committed with descriptive message
