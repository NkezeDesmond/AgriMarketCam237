# AgriMarket Cameroon Blueprint

## Purpose
AgriMarket Cameroon is an offline-first web application that helps farmers and buyers trade crops with real-time communication, order tracking, and market insights.

## Core Users
- Farmer: creates listings, receives orders, updates order status, chats with buyers.
- Buyer: browses listings, places orders, chats with farmers.
- Admin: manages users, moderates listings, manages official market price records.

## Key Product Areas
### Marketplace
- Browse active listings with filters (search, crop, region, max price).
- Listing details include photos, price, quantity/unit, description, and optional pickup GPS.

### Listings
- Farmers create listings with:
  - title, crop type, quantity/unit, price (XAF)
  - region + commune
  - optional harvest/expiry dates
  - up to 5 images
  - optional pickup GPS via map or device location

### Orders
- Buyers place orders from a listing.
- Farmers accept or reject pending orders.
- Buyers can cancel pending orders.
- Farmers can mark accepted orders as fulfilled.
- Order updates are reflected in real-time.

### Chat
- Buyers can message a seller from the listing detail page.
- Conversations are created automatically per buyer/seller pair.
- Messages appear in real-time.

### Prices
- Everyone can view market price trends by crop and region.
- Admins can add and delete official price points.
- Forecasts and insights are generated using a server-side advisory/forecast service (called via backend functions).

### Advisory
- A question-and-answer advisory interface for crop and market guidance.
- Requires internet connectivity.

### Offline-First
- If the user is offline:
  - browsing uses locally cached marketplace data when available
  - creating a listing can be queued for later sync
- A Sync page shows queued actions and allows manual retries.

## Quality Bar
- Clear navigation across desktop and mobile.
- Consistent typography, spacing, and form labeling.
- No emoji-based UI and no “AI” branding in user-facing text.

## Documents in App
All operational checklists and technical references are available in the in-app Docs screen under `/docs`.
