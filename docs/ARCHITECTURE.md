# FairFarm - Architecture Document

## Overview

FairFarm is a two-sided meat marketplace built with a modern serverless architecture. This document outlines the technical architecture, key design decisions, and system components.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Payments | Stripe Checkout |
| Webhooks | Supabase Edge Functions (Deno) |
| Email | Resend (via Edge Functions) |
| Hosting | Vercel (recommended) |

## Project Structure

```
FairFarm/
├── docs/                    # Documentation
│   ├── PRD.md              # Product requirements
│   ├── ARCHITECTURE.md     # This file
│   └── RUNBOOK.md          # Operations guide
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Auth routes (login, signup)
│   │   ├── (customer)/     # Customer-facing routes
│   │   ├── admin/          # Admin dashboard
│   │   ├── farm-portal/    # Farm management portal
│   │   ├── api/            # API routes
│   │   └── auth/           # Auth callbacks
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── ...             # Feature components
│   ├── lib/                # Utilities and clients
│   │   ├── supabase/       # Supabase client setup
│   │   ├── stripe/         # Stripe client setup
│   │   └── utils.ts        # Shared utilities
│   └── types/              # TypeScript types
│       └── database.ts     # Supabase schema types
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge Functions
│       ├── stripe-webhook/ # Payment webhook handler
│       └── send-email/     # Email sending utility
├── public/                 # Static assets
└── package.json
```

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   profiles   │     │    farms     │     │   products   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │────<│ owner_user_id│     │ id (PK)      │
│ role         │     │ id (PK)      │────<│ farm_id (FK) │
│ name         │     │ name         │     │ name         │
│ phone        │     │ slug         │     │ price        │
│ created_at   │     │ story        │     │ is_active    │
└──────────────┘     │ status       │     │ ...          │
                     │ ...          │     └──────────────┘
                     └──────────────┘
                            │
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       │
┌──────────────┐     ┌──────────────┐          │
│    orders    │     │ order_items  │          │
├──────────────┤     ├──────────────┤          │
│ id (PK)      │────<│ order_id(FK) │          │
│ order_number │     │ product_id   │──────────┘
│ customer_id  │     │ name_snapshot│
│ farm_id (FK) │     │ price_snapshot│
│ status       │     │ quantity     │
│ total        │     └──────────────┘
│ ...          │
└──────────────┘
        │
        │
┌───────┴───────┐
│               │
▼               ▼
┌──────────────┐     ┌──────────────┐
│ order_events │     │internal_notes│
├──────────────┤     ├──────────────┤
│ order_id(FK) │     │ order_id(FK) │
│ status_from  │     │ author_id    │
│ status_to    │     │ note         │
│ actor_role   │     │ created_at   │
└──────────────┘     └──────────────┘
```

### Enums

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'farm', 'admin');

-- Farm approval status
CREATE TYPE farm_status AS ENUM ('pending', 'approved', 'suspended');

-- Order fulfillment status
CREATE TYPE order_status AS ENUM (
  'processing',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'exception'
);

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
```

## Authentication Flow

### Sign Up Flow

```
┌────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│  User  │────>│ Signup   │────>│Supabase │────>│  Email   │
│        │     │  Form    │     │  Auth   │     │  Verify  │
└────────┘     └──────────┘     └─────────┘     └──────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  Trigger:   │
                              │create_profile│
                              │  function   │
                              └─────────────┘
```

### Auth Callback

1. User clicks email verification link
2. Supabase redirects to `/auth/callback`
3. Callback exchanges code for session
4. Profile is checked for role
5. User redirected based on role (customer → `/`, farm → `/farm-portal`, admin → `/admin`)

## Payment Flow

### Stripe Checkout Integration

```
┌────────────────────────────────────────────────────────────┐
│                     Payment Flow                            │
└────────────────────────────────────────────────────────────┘

1. Customer clicks "Checkout"
   │
   ▼
2. Client calls /api/checkout/create-session
   │
   ▼
3. Server creates Stripe Checkout Session
   - line_items from cart
   - metadata: { farm_id, user_id, cart_hash }
   - success_url: /order/[temp_id]?session={CHECKOUT_SESSION_ID}
   - cancel_url: /cart
   │
   ▼
4. Customer redirected to Stripe Checkout
   │
   ▼
5. Payment success → Stripe sends webhook
   │
   ▼
6. Edge Function: stripe-webhook
   - Verify signature
   - Check idempotency (stripe_checkout_session_id)
   - Create order + order_items
   - Send emails (customer, farm, admin)
   │
   ▼
7. Customer redirected to success_url
   - Page polls for order creation
   - Shows order details when ready
```

### Idempotency

The webhook handler uses `stripe_checkout_session_id` as an idempotency key:

```typescript
// Check if order already exists
const { data: existing } = await supabase
  .from('orders')
  .select('id')
  .eq('stripe_checkout_session_id', session.id)
  .single();

if (existing) {
  return new Response('Order already processed', { status: 200 });
}
```

## Row Level Security (RLS)

### Policy Overview

| Table | Read | Write |
|-------|------|-------|
| profiles | Own profile | Own profile |
| farms | Approved farms (public), own farm | Own farm |
| products | Active products of approved farms | Own farm's products |
| orders | Own orders, own farm's orders, admin all | Admin only |
| order_items | Via order access | Admin only |
| order_events | Via order access | Admin, system |
| internal_notes | Admin only | Admin only |

### Example: Orders RLS

```sql
-- Customers can view their own orders
CREATE POLICY "Customers read own orders"
ON orders FOR SELECT
USING (auth.uid() = customer_user_id);

-- Farms can view orders for their farm
CREATE POLICY "Farms read farm orders"
ON orders FOR SELECT
USING (
  farm_id IN (
    SELECT id FROM farms WHERE owner_user_id = auth.uid()
  )
);

-- Admins can read all orders
CREATE POLICY "Admins read all orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## Edge Functions

### stripe-webhook

**Purpose:** Handle Stripe webhook events for payment processing

**Events handled:**
- `checkout.session.completed` - Create order
- `payment_intent.payment_failed` - Mark order failed (if exists)

**Key responsibilities:**
1. Verify Stripe webhook signature
2. Parse event and extract session data
3. Check idempotency
4. Create order and order_items
5. Trigger email notifications
6. Return 200 to acknowledge receipt

### send-email

**Purpose:** Send transactional emails via Resend

**Email types:**
- `order_confirmation` - To customer
- `new_order_farm` - To farm
- `new_order_admin` - To admin
- `order_status_update` - To customer

## API Routes

### Customer APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/checkout/create-session` | POST | Create Stripe Checkout session |

### Admin APIs (Future)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/orders/[id]/status` | PATCH | Update order status |
| `/api/admin/farms/[id]/approve` | POST | Approve farm |

## Storage Buckets

### farm-images

- **Access:** Public read, authenticated write (farm owner)
- **Max size:** 5MB per file
- **Allowed types:** image/jpeg, image/png, image/webp
- **Structure:** `{farm_id}/hero.{ext}`, `{farm_id}/logo.{ext}`

### product-images

- **Access:** Public read, authenticated write (farm owner)
- **Max size:** 2MB per file
- **Allowed types:** image/jpeg, image/png, image/webp
- **Structure:** `{farm_id}/{product_id}.{ext}`

## Caching Strategy

### Static Generation

- Homepage: ISR with 60s revalidation
- Farm listing: ISR with 60s revalidation
- Farm profile: ISR with 60s revalidation

### Dynamic Rendering

- Cart: Client-side state
- Checkout: Server-side, no cache
- Orders: Server-side, no cache
- Admin/Farm portals: Server-side, no cache

## Error Handling

### Client Errors

```typescript
// Standardized error response
interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
```

### Webhook Error Handling

- Return 200 for processed events (even duplicates)
- Return 400 for malformed requests
- Return 500 for transient failures (Stripe will retry)
- Log all errors for debugging

## Security Considerations

1. **Environment Variables**
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
   - Never expose `STRIPE_SECRET_KEY` to client
   - Use `NEXT_PUBLIC_` prefix only for safe values

2. **Webhook Security**
   - Always verify Stripe webhook signatures
   - Use separate webhook endpoint secrets per environment

3. **RLS Enforcement**
   - Always use RLS, even for admin operations
   - Service role key only in Edge Functions for webhooks

4. **Input Validation**
   - Use Zod schemas for all API inputs
   - Sanitize user content before display

## Monitoring & Observability

### Recommended Tools

- **Error tracking:** Sentry
- **Analytics:** PostHog or Vercel Analytics
- **Logging:** Vercel Logs + Supabase Logs

### Key Metrics to Track

- Checkout conversion rate
- Webhook success rate
- API response times
- Error rates by endpoint

## Deployment

### Vercel Configuration

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### Environment Variables (Vercel)

Set in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_EMAIL`
- `NEXT_PUBLIC_APP_URL`

### Supabase Edge Functions Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy stripe-webhook
```
