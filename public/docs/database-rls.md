# Database and RLS Reference

## Tables (High Level)
- `profiles`: one row per authenticated user. Tracks role, verification, onboarding, and location.
- `listings`: crop listings created by farmers.
- `orders`: orders placed by buyers against a listing.
- `conversations`: a unique chat thread between two users.
- `messages`: chat messages linked to a conversation.
- `market_prices`: official market prices by crop and region.
- `reviews`: user reviews (baseline table; can be expanded as needed).

## Roles
- buyer
- farmer
- admin

Admins are determined by `profiles.role = 'admin'` and `profiles.suspended = false`.

## Key RLS Principles
### Profiles
- Users can read their own profile.
- Admins can read all profiles.
- Users can update their own profile.
- Admins can update all profiles.

### Listings
- Anyone can read active listings.
- Farmers can read their own listings.
- Admins can read all listings.
- Farmers can insert listings where `farmer_id = auth.uid()`.
- Farmers can update/delete their own listings; admins can update/delete any listing.

### Orders
- Only participants (buyer or farmer) can read an order.
- Buyers can insert orders where `buyer_id = auth.uid()`.
- Participants can update order status; admins can update as needed.

### Conversations and Messages
- Conversations are restricted to participants and admins.
- Messages can be read by participants (sender/recipient) and admins.
- Insert is restricted to the sender.

### Market Prices
- Read: open to everyone.
- Write: restricted to admins.

## Notes for Extending
- If you want buyers to see a seller’s display name in chat or listing detail, you must add a safe public-read mechanism (for example: a public view exposing only non-sensitive profile fields, with explicit RLS).
