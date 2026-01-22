# FairFarm - Development TODO

This checklist tracks the development progress of FairFarm across six phases.

---

## Phase A: Project Scaffolding ✅

- [x] Initialize Next.js 14+ with App Router
- [x] Configure TypeScript (strict mode)
- [x] Set up Tailwind CSS
- [x] Create folder structure
- [x] Set up ESLint configuration
- [x] Create environment template (.env.example)
- [x] Create documentation (PRD.md, ARCHITECTURE.md, RUNBOOK.md)
- [x] Create this TODO checklist
- [x] Set up Supabase client (browser + server)
- [x] Create database types file
- [x] Set up middleware for auth
- [x] Create auth pages (login, signup, forgot-password)
- [x] Create route structure placeholders
- [x] Verify build passes (pnpm build)
- [x] Verify lint passes (pnpm lint)
- [x] Verify typecheck passes (pnpm typecheck)

---

## Phase B: Customer Browsing & Cart ✅

### Seed Data
- [x] Create seed script for farms and products
- [x] 6 approved farms with realistic data
- [x] 8-12 products per farm
- [x] Idempotent seed (safe to re-run)
- [x] Document seed process in RUNBOOK.md

### Data Access Layer
- [x] Create src/lib/data/farms.ts
- [x] Create src/lib/data/products.ts
- [x] Server-side data fetching functions
- [x] Keep RLS intact (use server Supabase client)

### Farm Browsing (Home / Farm Feed)
- [x] Implement farm listing page with real data
- [x] Create FarmCard component with hero image, badges, delivery info
- [x] Add postcode/search input
- [x] Add badge filter pills (multi-select)
- [x] Loading skeletons
- [x] Empty state

### Farm Profile + Product List
- [x] Create /farm/[slug] page
- [x] Hero header with farm info
- [x] Story section with read more
- [x] Key details grid (delivery days, cutoff, fee)
- [x] Trust badges display
- [x] Product grid with images, prices, stock
- [x] Add to cart button and quantity stepper
- [x] Disable add if out of stock

### Cart with One-Farm Enforcement
- [x] Create Zustand cart store (src/lib/stores/cart.ts)
- [x] Cart persistence in localStorage
- [x] Add item / update quantity / remove item
- [x] One farm per order enforcement
- [x] Different farm modal with clear cart option
- [x] Cart page with item list and summary
- [x] Subtotal, delivery fee, total calculation
- [x] Minimum order enforcement
- [x] Proceed to checkout button

### Quality
- [x] TypeScript strict (no any)
- [x] next/image optimization
- [x] Good loading/empty states
- [x] Verify lint, typecheck, build pass

---

## Phase C: Checkout & Orders (No Stripe) ✅

### Database
- [x] Create RLS migration for customer order inserts
- [x] Add order number generation function

### Checkout Form
- [x] Checkout page layout
- [x] Delivery address form
- [x] Delivery instructions (optional)
- [x] Form validation with Zod
- [x] Order summary sidebar

### Order Creation (Test Mode - No Stripe)
- [x] Create POST /api/orders route handler
- [x] Validate cart and products server-side
- [x] Compute totals from DB prices (don't trust client)
- [x] Create order with order_items snapshots
- [x] Generate unique order number (FD-YYYYMMDD-XXXX)
- [x] Create initial order_event
- [x] Placeholder for notification emails (console log)

### Customer Order Pages
- [x] Order confirmation page (with celebration for new orders)
- [x] Order history page (/orders)
- [x] Order detail page (/order/[id])
- [x] Status timeline component
- [x] Order items display
- [x] Delivery address display

### Farm Portal Orders
- [x] Farm orders list page (/farm-portal/orders)
- [x] Farm order detail page (/farm-portal/orders/[id])
- [x] Order status updater component
- [x] POST /api/farm/orders/[id]/status route
- [x] Create order_event on status change

### Quality
- [x] TypeScript strict
- [x] Verify lint, typecheck, build pass
- [x] Update RUNBOOK.md with Phase C test steps

---

## Phase D: Address Book, Emails & Admin (No Stripe Yet) ✅

### Address Book
- [x] Create addresses table with RLS
- [x] Customer address CRUD API routes
- [x] Postcode lookup via postcodes.io
- [x] Address search via Nominatim (OSM)
- [x] Address picker component at checkout
- [x] Set default address
- [x] Store structured address in orders.delivery_address_json

### Email Notifications
- [x] Create email service with Resend integration
- [x] Fallback to email_outbox table when API key missing
- [x] Order confirmation email (customer)
- [x] New order notification (farm)
- [x] New order notification (admin)

### Admin Dashboard
- [x] Admin layout and navigation
- [x] Orders list with filters
- [x] Order detail with status updates
- [x] Internal notes system
- [x] Farms list with approve/suspend
- [x] Users list (read-only)

### Farm Portal Enhancements
- [x] Product management (create/edit/deactivate)
- [x] Image upload to Supabase Storage
- [x] Farm profile editing
- [x] Order status timeline

### Observability
- [x] /api/health endpoint
- [x] /debug page (dev-only)
- [x] pnpm selfcheck script

---

## Phase E: Split Platform Experience ✅

### Role-First Onboarding
- [x] Signup flow with role selection (Buy Meat vs Sell Meat)
- [x] Customer signup → Welcome → Marketplace
- [x] Farm signup → Onboarding wizard → Pending approval

### Farm Onboarding Wizard
- [x] Step 1: Farm name, slug, description
- [x] Step 2: Location and delivery postcodes
- [x] Step 3: Delivery settings (days, cutoff, fees)
- [x] Step 4: Add initial products
- [x] Step 5: Upload hero image
- [x] Create farm with status='pending'

### Separate Platform Experiences
- [x] Customer layout (marketplace branding, cart badge)
- [x] Farm layout (seller portal branding, dashboard sidebar)
- [x] Customer account menu with orders, addresses
- [x] Farm portal navigation with orders, products, profile

### Route Organization
- [x] (public) routes for /sell landing page
- [x] (customer) routes for authenticated customers
- [x] farm-portal routes for farm sellers
- [x] admin routes for platform admins

### Middleware Role Enforcement
- [x] Protect customer routes from farm users
- [x] Protect farm routes from customer users
- [x] Protect admin routes from non-admins
- [x] Redirect to onboarding if farm has no farm record
- [x] Role-based login redirects

### Marketing
- [x] /sell landing page for farm recruitment

### Quality
- [x] Update RUNBOOK.md with Phase E test flow
- [x] Verify lint, typecheck, build pass

---

## Phase F: Stripe Payments (Future)

### Stripe Integration
- [ ] Create checkout session API route
- [ ] Integrate Stripe Checkout redirect
- [ ] Handle success/cancel URLs
- [ ] Create stripe-webhook Edge Function
- [ ] Implement webhook signature verification
- [ ] Update order creation to use webhook
- [ ] Handle payment_intent.payment_failed

### Farm Payouts
- [ ] Connect Express onboarding
- [ ] Payout calculations
- [ ] Payout history

---

## Current Focus

**Active Phase:** E (Complete) → F (Stripe Payments)

**Completed Phases:**
- Phase A: Project Scaffolding ✅
- Phase B: Customer Browsing & Cart ✅
- Phase C: Checkout & Orders ✅
- Phase D: Address Book, Emails & Admin ✅
- Phase E: Split Platform Experience ✅

**Next Steps:**
1. Integrate Stripe Checkout for real payments
2. Set up Connect for farm payouts
3. Implement webhook handlers

---

## Notes

- Always run pnpm typecheck before committing
- Keep migrations small and focused
- Test RLS policies thoroughly
- Run pnpm db:seed to populate test data
- Phase C-E use test checkout (no actual payments) - Stripe comes in Phase F
- Platform is now split: Customer marketplace vs Farm seller portal
- Farm onboarding creates farms with `status='pending'` until admin approves
