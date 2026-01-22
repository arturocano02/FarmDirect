# FairFarm - Product Requirements Document

**Product name (working):** FairFarm  
**Platform:** Web app (mobile first, responsive desktop)  
**Tech stack (target):** Next.js + Supabase + Stripe + transactional email (Resend or Postmark)  
**V1 focus:** Meat marketplace with one farm per order, paid checkout, farm portal, admin ops console

---

## 1. Problem and Vision

### 1.1 Problem

Buying high quality meat directly from farms is currently fragmented and awkward:

- Farms have inconsistent online storefronts and ordering methods (DMs, forms, phone)
- Customers struggle to compare farms, trust claims, and understand delivery logistics
- Fulfillment coordination is often manual and error prone

### 1.2 Vision

Create the simplest and most premium way for customers to buy meat directly from farms, while giving farms a lightweight "sell and manage orders" system. Admins can coordinate logistics manually in early stages without the experience feeling messy.

### 1.3 Value Proposition

- **For customers:** discover trusted farms quickly, buy in a few taps, track status
- **For farms:** easy setup, clear orders, fewer admin calls, faster sales
- **For admins:** full visibility, reliable notifications, operational control

---

## 2. Goals and Non-Goals

### 2.1 Product Goals (V1)

- Customers can browse farms, view products, add to cart, pay, and receive confirmation
- Cart is restricted to a single farm per order
- Farms can create a profile, list products, and view orders
- Admins can view all orders, manage farms, and update order statuses
- Automated email notifications are sent on key events

### 2.2 Business Goals (V1)

- Enable real transactions with low operational complexity
- Create repeatable onboarding for farms
- Establish trust signals and a premium UX that drives conversion

### 2.3 Non-Goals (V1)

- Multi farm cart and split fulfillment
- Automated driver dispatch and route optimization
- Complex subscription and recurring boxes
- Live inventory synchronization with farm ERPs
- Customer to farm direct messaging (admin mediated communications only)

---

## 3. Users, Roles, and Permissions

### 3.1 Roles

- **Customer** (buyer)
- **Farm** (seller)
- **Admin** (operator)

### 3.2 Permission Principles

- Customers can view all approved farms and products
- Customers can only view their own orders
- Farms can only edit their farm profile and products
- Farms can only view orders placed with their farm
- Admins have global access to manage all entities

---

## 4. Key User Journeys

### 4.1 Customer Journey (Happy Path)

1. Land on homepage
2. Enter postcode or pick a suggested area
3. Browse farm feed with filters
4. Open a farm profile
5. Add meat products to cart
6. Checkout: details, address, pay
7. See confirmation page and receive confirmation email
8. View order status in "My Orders"

### 4.2 Customer Edge Cases

**Try to add products from another farm**
- Expected: prompt explaining one farm per order, offer "Start new order" or "Clear cart"

**Payment succeeds but webhook fails**
- Expected: admin alert, retry webhook, customer sees "Processing" state

**Farm cannot fulfill an item**
- Expected: admin can mark item unavailable, contact customer, partial refund flow (V1.1)

### 4.3 Farm Journey (Happy Path)

1. Sign up as farm
2. Complete setup wizard
3. Submit for approval
4. After approval, farm appears publicly
5. Receive an order email notification
6. View order in dashboard
7. Update order status as they prepare it
8. Download packing slip

### 4.4 Admin Journey (Happy Path)

1. Receive admin order notification email
2. Open admin dashboard
3. Review order details, delivery window, farm prep status
4. Coordinate pickup and delivery manually
5. Update order statuses so customer tracking feels real
6. Resolve exceptions with internal notes

---

## 5. Information Architecture (Routes)

### 5.1 Public Customer Routes

| Route | Description |
|-------|-------------|
| `/` | Home with search and farm feed |
| `/farms` | Farm listing (optional, can be homepage feed) |
| `/farm/[slug]` | Farm profile with products |
| `/cart` | Cart |
| `/checkout` | Checkout flow |
| `/order/[id]` | Order confirmation and tracking |
| `/account` | Profile |
| `/orders` | Order history |

### 5.2 Auth Routes

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/signup` | Create account |
| `/forgot-password` | Password reset |

### 5.3 Farm Portal Routes

| Route | Description |
|-------|-------------|
| `/farm-portal` | Dashboard |
| `/farm-portal/setup` | Onboarding wizard |
| `/farm-portal/profile` | Edit farm profile |
| `/farm-portal/products` | Products list |
| `/farm-portal/products/new` | Add product |
| `/farm-portal/orders` | Orders list |
| `/farm-portal/orders/[id]` | Order detail + packing slip |

### 5.4 Admin Routes

| Route | Description |
|-------|-------------|
| `/admin` | Overview |
| `/admin/orders` | All orders |
| `/admin/orders/[id]` | Order detail and controls |
| `/admin/farms` | Farm approvals and management |
| `/admin/farms/[id]` | Farm detail |
| `/admin/taxonomy` | Badges and tags (optional V1) |

---

## 6. UX and UI Requirements

### 6.1 Design Principles

- Mobile first, thumb friendly, fast scrolling
- Premium food aesthetic: strong imagery, lots of whitespace, clear typography
- Trust forward: badges, provenance cues, clear delivery rules
- Checkout simplicity: minimal fields, clear steps, no surprises
- Operational honesty: if delivery is manual, show accurate wording without overpromising

### 6.2 Farm Cards (Feed)

Each card must show:
- Hero photo
- Farm name
- 1 line value statement
- Up to 3 badges
- Delivery days or delivery estimate (even if broad)
- Minimum order value (optional)

### 6.3 Farm Profile Page

Must include:
- Story section with expandable "Read more"
- Key details grid (delivery days, cutoff time, fresh or frozen, packaging)
- Product list with add buttons
- Trust badges repeated and explained (optional tooltips)

### 6.4 Product Display

Each product must have:
- Image
- Name
- Unit description (weight, pack count)
- Price
- Stock indicator
- Add button and quantity stepper

### 6.5 Cart

Must include:
- Items list with quantity controls
- Subtotal, delivery fee, total
- Clear "one farm per order" logic
- Delivery notes input (optional V1)

### 6.6 Checkout

Minimum fields:
- Email, phone, name
- Delivery address
- Delivery instructions (optional)
- Payment via Stripe

### 6.7 Order Tracking UI

Must include:
- Status timeline with timestamps
- Order summary
- Delivery address summary
- Support contact link (admin email)

---

## 7. Functional Requirements

### 7.1 Customer Features (Must Have)

- Browse farms (approved only)
- Filter farms by badges, delivery days, distance or postcode eligibility
- View farm profile and products
- Add to cart (single farm restriction)
- Checkout and pay
- Receive email confirmation
- View order history and order detail
- Basic order status tracking

### 7.2 Customer Features (Should Have)

- Saved addresses
- Favorite farms
- Reorder previous order
- Delivery slot selection (simple predefined windows)

### 7.3 Farm Features (Must Have)

- Farm signup and authentication
- Setup wizard to create farm profile
- Upload farm images and product images
- Create, edit, deactivate products
- View orders and order details
- Update order status
- Generate packing slip view

### 7.4 Farm Features (Should Have)

- Stock management with low stock warnings
- Product categories and bundles
- Export orders CSV

### 7.5 Admin Features (Must Have)

- Admin view of all orders
- Admin view of all farms and approval workflow
- Update any order status
- Add internal notes to orders
- Email notifications on new orders

### 7.6 Admin Features (Should Have)

- Manual refund workflow entry (with Stripe integration in V1.1)
- Customer support tooling: resend confirmation, change delivery window
- Farm quality controls: featured farms, badge management

---

## 8. Payments and Order Creation

### 8.1 Payment Approach

Stripe Checkout or Payment Intents. Recommended for V1: Stripe Checkout for speed and reliability.

### 8.2 Order Creation Logic

1. Customer builds cart client side
2. On checkout, create a Stripe session for the farm order
3. On Stripe success, webhook triggers an Edge Function
4. Edge Function creates the order and order items in Supabase
5. Email notifications sent to customer, farm, and admin
6. Customer redirected to order confirmation page

### 8.3 Failure Handling

- If webhook fails, order status is "Processing" and admin gets alert
- Webhook retries must be supported
- Idempotency keys must prevent duplicate orders

---

## 9. Notifications and Communication

### 9.1 Email Triggers (V1)

- Order confirmed (customer)
- New order received (farm)
- New order received (admin)
- Order status changed (customer, optional V1 but recommended)

### 9.2 Email Content Requirements

- Clear summary: farm, items, total, delivery address, delivery window
- Link to order tracking page
- Support contact email

---

## 10. Data Model (Supabase)

### 10.1 Core Tables

**profiles**
- id, role, name, phone, created_at

**farms**
- id, owner_user_id, name, slug, story, address, postcode_rules, badges, delivery_days, cutoff_time, status, created_at

**products**
- id, farm_id, name, description, price, unit_label, weight_label, stock_qty, is_active, sort_order, created_at

**orders**
- id, order_number, customer_user_id, farm_id, status, payment_status, subtotal, delivery_fee, total, delivery_address, delivery_notes, delivery_window, stripe_payment_intent_id, created_at

**order_items**
- id, order_id, product_id, name_snapshot, price_snapshot, quantity, unit_snapshot, weight_snapshot

**order_events** (recommended)
- id, order_id, actor_role, status_from, status_to, created_at

**internal_notes** (admin only)
- id, order_id, note, created_at

### 10.2 Storage Buckets

- farm-images
- product-images

---

## 11. Security, Privacy, and Compliance

### 11.1 RLS Policies (High Level)

- **profiles:** user can read and update own profile
- **farms:** public read only for approved farms, farm owner can edit own
- **products:** public read only for active products of approved farms, farm owner can edit own
- **orders:** customer can read own orders, farm can read orders for their farm, admin can read all
- **internal_notes:** admin only
- **order_events:** customer can read own order events, farm can read events for their farm orders, admin all

### 11.2 GDPR Baseline

- Collect only needed customer data (name, email, phone, address)
- Provide a clear privacy policy and data retention policy
- Allow account deletion request path (V1 can be manual but documented)

---

## 12. Non-Functional Requirements

### 12.1 Performance

- Farm feed loads in under 2 seconds on 4G for typical payload
- Images must be optimized and lazy loaded
- Use pagination or infinite scroll for farms

### 12.2 Reliability

- Webhook order creation is idempotent
- Order status changes are logged
- Admin notifications must not silently fail

### 12.3 Accessibility

- Semantic HTML and keyboard navigation for core flows
- Form labels and error states clearly announced
- Color contrast meets WCAG AA where feasible

### 12.4 Observability

- Error logging for web app and Edge Functions
- Basic analytics events (see section 13)

---

## 13. Analytics and Success Metrics

### 13.1 Funnel Events (V1)

- Viewed farm feed
- Viewed farm profile
- Added to cart
- Started checkout
- Payment success
- Order confirmation viewed
- Order delivered (status)

### 13.2 Core Metrics

- Conversion rate: farm view → purchase
- Checkout completion rate
- Repeat purchase rate
- Average order value
- Order issue rate (manual tag by admin)

---

## 14. MVP Scope and Milestones

### 14.1 V1 MVP Deliverables

- Customer browsing, farm profile, product list
- Cart and single farm enforcement
- Stripe checkout and webhook order creation
- Customer orders page and tracking
- Farm onboarding wizard + product CRUD
- Farm orders dashboard
- Admin orders dashboard + farm approvals
- Email notifications

### 14.2 V1.1 Enhancements

- Refund and partial refund tooling
- Delivery slot selection and cutoff enforcement
- Bundles and featured collections
- Reorder and favorites

---

## 15. Operational Policies (V1)

### 15.1 Order Statuses

Proposed statuses:
- **Processing** (payment succeeded, awaiting DB confirmation or review)
- **Confirmed** (order created and farm notified)
- **Preparing** (farm acknowledged and packing)
- **Ready for pickup** (packed)
- **Out for delivery**
- **Delivered**
- **Cancelled**
- **Exception** (needs attention)

### 15.2 Cutoff and Delivery

V1 can start with simple rules:
- Farm sets delivery days and cutoff time
- System displays it as guidance
- Admin confirms delivery window if needed

---

## 16. Risks and Mitigations

### 16.1 Risk: Fulfillment Complexity Early

Mitigation: enforce one farm per order, sell bundles, keep delivery windows simple

### 16.2 Risk: Trust and Quality Concerns

Mitigation: strong farm stories, badges, clear policies, admin approval before going live

### 16.3 Risk: Payment and Webhook Failure

Mitigation: idempotent webhook, "Processing" state, admin alerts, retry logic

### 16.4 Risk: Farms Struggle with Tooling

Mitigation: setup wizard, minimal required fields, simple orders table, packing slip view

---

## 17. Acceptance Criteria (V1)

### 17.1 Customer

- Customer can place a paid order end to end
- Customer receives confirmation email within 1 minute
- Customer can view order status timeline after purchase
- Cart cannot contain items from multiple farms

### 17.2 Farm

- Farm can create profile and products
- Farm can see new orders within 1 minute of purchase
- Farm can update order status and see it reflected for customer

### 17.3 Admin

- Admin receives email on every paid order
- Admin can view and update any order
- Admin can approve or suspend farms

---

## 18. Build Plan Blueprint (Cursor Friendly)

### 18.1 Repo Structure (Recommended)

- Next.js app routes for customer, farm portal, admin
- Shared UI component library
- Supabase client and auth helpers
- Stripe integration and webhook handler (Edge Function)
- Email sending utility in Edge Function

### 18.2 Build Order

1. Supabase schema + RLS + Storage buckets
2. Customer browsing UI
3. Cart logic and one farm enforcement
4. Stripe checkout and webhook order creation
5. Customer order pages
6. Farm onboarding and product management
7. Farm orders dashboard
8. Admin console and approvals
9. Email notifications and status updates

---

## 19. Default Product Decisions (So You Can Move Fast)

- One farm per order in V1
- Farms must be approved before appearing publicly
- Start with simple delivery windows and admin coordination
- Stripe Checkout for payments
- Email only notifications in V1
