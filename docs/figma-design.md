# AgriMarket Cameroon — Figma Design System (v1)

This document is a Figma-ready UI/UX spec you can implement as a component library + screens. It is optimized for rural/outdoor use (high contrast, large tap targets) and for PWA behavior.

## 1) File structure (Figma pages)

- **00 - Cover**
- **01 - Foundations**
  - Colors
  - Typography
  - Spacing & Radius
  - Shadows
  - Icons
  - Grid & Breakpoints
- **02 - Components**
  - Buttons
  - Inputs
  - Badges
  - Cards
  - Navigation
  - Toast/Alerts
  - Bottom Sheet
  - Tabs
  - Data Table (Admin)
  - Chat bubbles
  - Listing cards
  - Order status chips
- **03 - Patterns**
  - Empty states
  - Loading states
  - Error states
  - Offline states + sync banner
  - OTP flow
  - Create listing flow (with map)
- **04 - Screens (Mobile 360)**
- **05 - Screens (Tablet 768)**
- **06 - Screens (Desktop 1280)**
- **07 - Prototype**

## 2) Breakpoints & layout rules

- **Mobile:** 360×800 (primary)
- **Tablet:** 768×1024
- **Desktop:** 1280×832

Layout:
- Use **12-column grid** on desktop, **8-column** tablet, **4-column** mobile.
- Minimum tap target: **44×44**.
- Default container max width: **1200px**.
- Primary navigation: **top bar** on desktop/tablet, **top bar + (later) bottom nav** on mobile.

## 3) Brand + color tokens (outdoor readable)

Backgrounds:
- `bg/0`: #0B1220 (near-black navy)
- `bg/1`: #0F172A (slate)
- `surface/1`: #111827 (cards)
- `surface/2`: #0B1324 (panels)

Text:
- `text/primary`: #E5E7EB
- `text/muted`: #9CA3AF
- `text/inverse`: #0B1220

Primary (agriculture green):
- `primary/500`: #16A34A
- `primary/600`: #15803D
- `primary/100`: #DCFCE7

Status:
- `warning`: #F59E0B
- `danger`: #EF4444
- `info`: #38BDF8

Borders:
- `border`: #1F2937

Accessibility:
- Aim for **WCAG AA contrast** for body text (≥ 4.5:1).
- Avoid low-contrast grays on bright outdoor screens; prefer `text/primary`.

## 4) Typography

Use system font stack in Figma to match web:
- Title: 28/32, Semibold
- H2: 20/26, Semibold
- Body: 14/22, Regular
- Caption: 12/18, Regular
- Button: 14/20, Medium

Rules:
- Keep important numbers (XAF prices) in **semibold**.
- Avoid long paragraphs; use bullets + short lines.

## 5) Spacing, radius, shadows

Spacing scale (8pt base):
- 4, 8, 12, 16, 24, 32

Radius:
- `r/sm`: 10
- `r/md`: 14
- `r/lg`: 18
- Card radius: 16–18

Shadows (subtle; dark UI):
- `shadow/1`: 0 8 24 rgba(0,0,0,0.25)

## 6) Component specs (Auto Layout)

### 6.1 Button

Variants:
- Primary: green background, white text
- Secondary: slate background
- Outline: transparent + border
- Destructive: red

Sizes:
- Default: 40px height, 16px horizontal padding
- Small: 36px height

States:
- Hover, pressed, disabled, focus ring (2px)

### 6.2 Input

Height: 40px
Padding: 12px horizontal
States: default, focus, error, disabled

### 6.3 Badge/Chip

Height: 22–24px
Variants: default, success, warning, danger

### 6.4 Card

Header: title + optional chips
Body: metadata rows
Footer: actions

### 6.5 Listing Card (Marketplace)

Auto layout vertical:
- Title (2 lines max)
- Chips row: crop + price
- Meta row: region/commune + qty/unit

### 6.6 Chat Bubble

Mine: primary background
Theirs: muted background
Timestamp: caption style, 70% opacity

### 6.7 Offline Sync Banner

Top or bottom sticky banner:
- Offline: amber chip + text “Saved offline, will sync”
- Online: green chip

## 7) Screen set (what to design)

Design each for Mobile + Desktop:

1. **Landing**
   - Hero + benefits cards
2. **Auth (Phone OTP)**
   - Step 1: phone input (+237 prefix)
   - Step 2: OTP entry
3. **Marketplace**
   - Filters bar
   - Listing grid
   - Empty state
4. **Listing Details**
   - Image grid
   - Price + crop chips
   - Order module (qty + CTA)
   - Map preview
5. **Create Listing**
   - Form + image upload
   - Map picker + “Use my location”
   - Offline save flow
6. **Orders**
   - Status chips
   - Farmer actions: accept/reject/fulfilled
7. **Chat**
   - Conversation list + message thread
8. **Admin Dashboard**
   - Cards: moderation queue + KPIs
   - Data table patterns

## 8) Prototype flows (clickable)

Flow A (Buyer):
Landing → Marketplace → Listing Detail → Place Order → Orders → Chat

Flow B (Farmer):
Landing → Auth → Create Listing → Marketplace → Orders → Chat

## 9) Handoff mapping to code (Tailwind tokens)

The web app currently uses CSS variables in:
- `src/index.css`

In Figma, keep token names aligned (primary/background/foreground/border) so UI stays consistent when we extend shadcn components.

