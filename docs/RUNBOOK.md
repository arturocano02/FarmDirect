# Farmlink - Runbook

This document provides instructions for local development and deployment using **Supabase Cloud** (no Docker required).

## Prerequisites

- Node.js 18.17+ (LTS recommended)
- pnpm 8+ (`npm install -g pnpm`)
- A Supabase account ([supabase.com](https://supabase.com))
- Git

## Quick Start (TL;DR)

```bash
# 1. Clone and install
git clone <repository-url>
cd Farmlink
pnpm install

# 2. Create Supabase project and get credentials
# See "Supabase Cloud Setup" section below

# 3. Create .env.local with your credentials
cp .env.example .env.local
# Edit .env.local with your Supabase URL and keys

# 4. Apply database migrations
pnpm db:print-migrations
# Copy output to Supabase SQL Editor and run

# 5. Seed test data
pnpm db:seed

# 6. Verify data
pnpm db:sanity

# 7. Start dev server
pnpm dev
# Visit http://localhost:3000
```

---

## Exact Run Order (Copy-Paste Ready)

After initial setup, this is the exact order to get a working farm feed:

```bash
# Step 1: Print migrations (copy output)
pnpm db:print-migrations

# Step 2: Paste into Supabase SQL Editor (Dashboard → SQL Editor → New Query → Paste → Run)

# Step 3: Seed the database with 20 farms and products
pnpm db:seed

# Step 4: Verify data exists
pnpm db:sanity

# Step 5: Start development server
pnpm dev

# Step 6: Open browser
# http://localhost:3000
```

If `pnpm db:sanity` reports "0 farms", something went wrong. Check:
1. Migrations were applied (no SQL errors in Supabase)
2. `.env.local` has correct `SUPABASE_SERVICE_ROLE_KEY`
3. Run `pnpm db:seed` again and check for errors

---

## Supabase Cloud Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name:** Farmlink (or your choice)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose the closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (~2 minutes)

### Step 2: Get API Credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Important:** The service_role key bypasses Row Level Security. Never expose it to the client or commit it to version control.

### Step 3: Configure Auth Settings

1. Go to **Authentication** → **URL Configuration**
2. Set these values:

| Setting | Value |
|---------|-------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/**` |

3. Click "Save"

### Step 4: Create .env.local

```bash
# Copy the template
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Apply Database Migrations

1. Print the migrations:
   ```bash
   pnpm db:print-migrations
   ```

2. Go to your Supabase Dashboard → **SQL Editor**
3. Click "New query"
4. Paste the entire output from step 1
5. Click "Run" (or Cmd/Ctrl + Enter)
6. Verify success - you should see green checkmarks

### Step 6: Seed Test Data

```bash
pnpm db:seed
```

This will create:
- 20 approved farms with realistic data and Unsplash images
- 12 products per farm (240 products total)
- A system user for farm ownership

The seed script is **idempotent** - safe to run multiple times.

### Step 7: Verify Database State

```bash
pnpm db:sanity
```

This will:
- Count approved farms and active products
- Display sample farm names
- Exit with error if farms count is 0

### Step 8: Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your farms!

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build production bundle |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript compiler check |
| `pnpm db:seed` | Seed database with 20 farms and products |
| `pnpm db:sanity` | Verify database has approved farms |
| `pnpm db:print-migrations` | Print SQL migrations for copy/paste |
| `pnpm selfcheck` | Verify env vars, tables, and API health |

---

## Environment Variables

### Required for Development

```env
# Supabase (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Required for Production

All variables above, plus:

```env
# Stripe (use live keys for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=orders@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Admin Access (optional - for discreet admin signup)
ADMIN_EMAILS=admin@example.com,superadmin@example.com
ADMIN_CLAIM_CODE=FARMADMIN26
```

---

## Database Operations

### Viewing Your Database

1. Go to Supabase Dashboard → **Table Editor**
2. You'll see all tables: `farms`, `products`, `orders`, etc.
3. Click any table to view/edit data

### Running Custom SQL

1. Go to **SQL Editor**
2. Write your query
3. Click "Run"

### Resetting the Database

To completely reset and re-seed:

1. Go to **SQL Editor**
2. Run:
   ```sql
   -- Delete all data (careful!)
   TRUNCATE farms, products, orders, order_items, order_events, internal_notes CASCADE;
   ```
3. Re-run migrations if needed
4. Run `pnpm db:seed`

### Updating Migrations

If you need to modify the schema:

1. Edit the migration files in `supabase/migrations/`
2. Run `pnpm db:print-migrations`
3. Either:
   - Apply the changes manually in SQL Editor, OR
   - Reset the database and re-apply all migrations

---

## Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Select the Farmlink project

### Step 2: Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `pnpm build` |
| Install Command | `pnpm install` |

### Step 3: Set Environment Variables

Add all production environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EMAIL_FROM=orders@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

### Step 4: Update Supabase Auth URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Update:
   - **Site URL:** `https://your-domain.vercel.app`
   - **Redirect URLs:** Add `https://your-domain.vercel.app/**`

### Step 5: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app is live!

---

## Stripe Setup

### For Local Development

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Go to **Developers** → **API Keys**
3. Copy the test mode keys to `.env.local`

### For Webhooks (Later Phases)

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks:
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Diagnostic Tools

### Health Check APIs

Farmlink includes several health check endpoints for debugging and verification:

**GET `/api/health`** - General health check (no auth required):
```bash
curl http://localhost:3000/api/health
```
Returns: `{ supabaseUrl, approvedFarmsCount, activeProductsCount, sampleFarms, error }`

**GET `/api/health/public-farms`** - Public farms access check (no auth required):
```bash
curl http://localhost:3000/api/health/public-farms
```
Returns: `{ ok, farmCount, farms, diagnostics }`

**GET `/api/health/me`** - Current user info:
```bash
curl http://localhost:3000/api/health/me
```
Returns: `{ loggedIn: boolean, email: string | null, role: string | null }`

**GET `/api/health/roles`** - Current user role (alias for /me):
```bash
curl http://localhost:3000/api/health/roles
```
Returns: `{ authenticated: boolean, email, role, userId }`

**GET `/api/health/admin`** - Admin access verification:
```bash
curl http://localhost:3000/api/health/admin
```
Returns: `{ ok: true, email, role: "admin" }` if admin, otherwise 401/403

If `approvedFarmsCount` is 0 but `pnpm db:sanity` shows farms exist, there may be an RLS or env var issue.

### Debug Page (`/debug`) - Development Only

Visit `http://localhost:3000/debug` to see:
- Supabase URL being used
- Database counts (farms, products)
- Sample farm names
- Session status (logged in/out)

This page is **only available in development** (`NODE_ENV=development`).

---

## Troubleshooting

### "0 farms" or empty homepage

1. Visit `/api/health` to check connection
2. Run `pnpm db:sanity` to check database state
3. If 0 farms, check:
   - Migrations were applied (run `pnpm db:print-migrations`, paste in SQL Editor)
   - `SUPABASE_SERVICE_ROLE_KEY` is correct in `.env.local`
   - Run `pnpm db:seed` and look for errors
4. Check server console for `[farms]` log messages

### RLS Policy Recursion Error (42P17)

If you see this error:
```
42P17: infinite recursion detected in policy for relation "profiles"
```

This means the database has old RLS policies that cause recursion. **Fix:**

1. Run `pnpm db:print-migrations` 
2. Copy the output and paste into Supabase SQL Editor
3. Run the SQL (the migration `00003_fix_rls_recursion.sql` fixes this)

**What the fix does:**
- Creates helper functions (`is_admin()`, `get_my_role()`) that use `SECURITY DEFINER`
- These functions bypass RLS when checking user role, preventing recursion
- Recreates admin check policies to use these functions
- Public read policies for farms/products are unchanged

**If you only need the RLS fix** (database already has tables), run just the contents of:
```
supabase/migrations/00003_fix_rls_recursion.sql
```

### "Missing environment variable" error

Make sure you have `.env.local` with all required variables. Check:
```bash
cat .env.local
```

### Seed script fails

1. Check your `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Make sure migrations have been applied
3. Check Supabase Dashboard for any errors

### Auth not working

1. Verify Auth URL settings in Supabase Dashboard
2. Make sure Site URL is `http://localhost:3000` for dev
3. Check browser console for errors

### Resetting Auth State (Browser)

If auth gets into a weird state (stuck sessions, stale tokens), clear it:

**Option 1: Clear Site Data (Chrome)**
1. Open DevTools (F12) → Application tab
2. Click "Clear site data" in the left sidebar
3. Check all boxes and click "Clear site data"
4. Refresh the page

**Option 2: Clear Cookies Manually**
1. Open DevTools (F12) → Application tab → Cookies
2. Delete all cookies starting with `sb-` (Supabase cookies)
3. Refresh the page

**Option 3: Use Incognito/Private Mode**
- Open an incognito window for a completely clean session

### Email Confirmation Issues

If you see "Email not confirmed" error:

1. Check your inbox (including spam) for the confirmation email
2. Click the confirmation link in the email
3. The link expires after 24 hours - if expired, use the "Resend confirmation email" button on the login page
4. If still not working, check Supabase Dashboard → Authentication → Users to see the user's email_confirmed_at status

### Sign Out Not Working

If signing out doesn't fully clear the session:
1. Click Sign Out
2. Clear site data (see above)
3. Refresh the page

The app includes a full sign-out that redirects to homepage and forces a window reload.

### "Policy violation" errors

This usually means RLS is blocking the operation. For seeding, make sure you're using the service role key. For the app, check that RLS policies are correct.

### Images not loading

Make sure `images.unsplash.com` is in `next.config.mjs` remotePatterns. The current config should already include it.

### Public Farm Access Not Working

If anonymous users or customers can't see farm listings:

**Quick Diagnosis:**
```bash
# Check farm data exists
curl http://localhost:3000/api/health/public-farms
```

Expected response:
```json
{
  "ok": true,
  "farmCount": 20,
  "farms": [{"name": "...", "slug": "..."}],
  "diagnostics": {...}
}
```

**If `farmCount: 0` but farms exist in database:**

1. **Check RLS Policies:**
   - Go to Supabase SQL Editor
   - Run the migration `supabase/migrations/00007_fix_public_farm_access.sql`
   - This ensures anon users can SELECT approved farms and active products

2. **Verify Helper Functions:**
   ```sql
   -- Should return false for anon user
   SELECT public.is_admin();
   
   -- Should return approved farms
   SELECT count(*) FROM farms WHERE status = 'approved';
   ```

3. **Check Client Usage:**
   - `src/lib/data/farms.ts` should use `createAnonClient()` (anon key)
   - NOT the service role client
   - Check server logs for `[farms]` messages

**Verification Checklist:**

| Test | URL | Expected Result |
|------|-----|-----------------|
| Logged out: browse farms | `/farms` | See farm listings |
| Logged out: view farm | `/farm/[slug]` | See farm profile + products |
| Logged out: health check | `/api/health/public-farms` | `ok: true, farmCount > 0` |
| Customer: browse farms | `/farms` | See farm listings |
| Customer: view farm | `/farm/[slug]` | See farm profile + products |
| Farm user: browse farms | `/farms` | See farm listings (public) |
| Admin: browse farms | `/farms` | See farm listings (public) |

**Common Fixes:**

1. **Apply RLS migration:**
   ```bash
   pnpm db:print-migrations
   # Copy and paste into Supabase SQL Editor → Run
   ```

2. **Restart dev server after migrations:**
   ```bash
   # Ctrl+C, then
   pnpm dev
   ```

3. **Clear browser cache** if you see stale data.

### Build fails with type errors

```bash
pnpm typecheck
```

Fix any errors before building.

### React Hydration Error

**Symptom:**
```
Uncaught Error: There was an error while hydrating... entire root will switch to client rendering.
```

**Root Cause:**
Server-side rendering produces HTML that differs from what the client produces during hydration. Common causes:
1. **Zustand with localStorage persistence:** The cart store reads from localStorage immediately on client, but server renders with empty state.
2. **Auth state differences:** Server may not have session, but client does.
3. **Browser-only APIs:** Using `window`, `localStorage`, `navigator` during render.

**How We Fixed It:**
1. Created a `useMounted()` hook (`src/lib/hooks/use-mounted.ts`) that returns `false` on server and `true` only after client mount.
2. Updated `CartBadge` to only show the item count badge after mounted.
3. Updated `CartContent` to show a loading skeleton until mounted.
4. Updated `ProductCard` to use `displayQuantity = mounted ? cartQuantity : 0` to ensure consistent initial render.

**Pattern for Fixing Hydration Issues:**

```tsx
"use client";
import { useMounted } from "@/lib/hooks/use-mounted";

function MyComponent() {
  const mounted = useMounted();
  const browserOnlyData = useSomeStoreWithPersistence();
  
  // Show consistent loading state on server and initial client render
  if (!mounted) {
    return <MySkeleton />;
  }
  
  // Safe to use browser-only data after mount
  return <div>{browserOnlyData}</div>;
}
```

**Key Principle:** The first client render must produce the exact same HTML as the server. Only after `useEffect` runs can you show browser-specific content.

---

## Phase C Testing (Checkout Flow)

After applying all migrations (including `00004_order_insert_policies.sql`), test the complete checkout flow:

### Prerequisites
1. Apply all migrations: `pnpm db:print-migrations` → paste in SQL Editor → Run
2. Seed data: `pnpm db:seed`
3. Start dev server: `pnpm dev`

### Test as Customer

1. **Create a customer account:**
   - Go to `/signup`
   - Choose "Buy Meat" (customer role)
   - Use a real email you can verify
   - Verify your email via the confirmation link

2. **Browse and add to cart:**
   - Go to homepage, click on a farm
   - Add 2-3 products to cart
   - Verify cart shows items with correct prices

3. **Place an order:**
   - Go to `/cart` → "Proceed to Checkout"
   - Enter a delivery address
   - Click "Place Order"
   - You should be redirected to `/order/[id]?new=true` with celebration message

4. **View order:**
   - Go to `/orders` to see order list
   - Click an order to see details and status timeline

5. **Verify in Supabase:**
   - Check `orders` table has the new order
   - Check `order_items` has the products
   - Check `order_events` has the initial "processing" event

### Test as Farm

1. **Create a farm account:**
   - Sign out first
   - Go to `/signup`
   - Choose "Sell Meat" (farm role)
   - Verify email

2. **Note:** For testing, you may need to manually update the seeded farm's `owner_user_id` in Supabase to your new farm user's ID. Or create a new farm.

3. **View orders:**
   - Go to `/farm-portal/orders`
   - You should see the order placed by the customer

4. **Update status:**
   - Click on an order
   - Change status to "Confirmed"
   - Click "Update Status"
   - Verify the order history shows the change

5. **Customer sees update:**
   - Switch back to customer account
   - Go to `/order/[id]` - status should show "Confirmed"

### Quick Test (No Email Verification)

For faster testing, you can disable email confirmation in Supabase:
1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Uncheck "Confirm email"
3. Save

Remember to re-enable it for production!

---

## Phase D Setup (Address Book, Emails, Admin Dashboard)

Phase D introduces several new features. Follow these steps to set them up.

### 1. Apply New Migrations

New migrations for Phase D:
- `00005_addresses.sql` - Customer address book
- `00006_email_outbox_and_order_enhancements.sql` - Email queue and order improvements

```bash
# Print all migrations (includes Phase D)
pnpm db:print-migrations

# Copy and paste into Supabase SQL Editor, then Run
```

### 2. Configure Email (Optional for Dev)

For development, emails are logged to console and stored in `email_outbox` table.

For production, set up [Resend](https://resend.com):

```env
RESEND_API_KEY=re_xxx...
EMAIL_FROM=Farmlink <orders@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com
```

### 3. Configure Storage Buckets (Image Uploads)

For farm and product image uploads:

1. Go to Supabase Dashboard → Storage
2. Create bucket `farm-images` (public)
3. Create bucket `product-images` (public)
4. Add RLS policies (or use public buckets for simplicity in dev)

### 4. Run Selfcheck

```bash
pnpm selfcheck
```

This verifies:
- All required env vars are set
- Database tables exist (including Phase D tables)
- API health endpoint works
- Farms and products are seeded

### 5. Test Phase D Features

**Address Book:**
1. Log in as a customer
2. Go to checkout
3. Add a new address using the postcode lookup
4. Save and use the address for an order

**Admin Dashboard:**
1. Create an admin user:
   ```sql
   -- In Supabase SQL Editor
   UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id';
   ```
2. Visit `/admin`
3. Test order status updates and internal notes
4. Test farm approval/suspension

**Farm Portal:**
1. Log in as a farm user
2. Go to `/farm-portal/products/new` to add a product with image
3. Go to `/farm-portal/profile` to edit farm details and upload hero image

**Email:**
- Check `email_outbox` table in Supabase for queued emails (when RESEND_API_KEY not set)
- With Resend configured, emails are sent automatically on order creation

---

## Phase D Test Checklist

### As Customer (Logged Out)
- [ ] Browse farms on homepage
- [ ] View farm profile and products

### As Customer (Logged In)
- [ ] Sign up / sign in
- [ ] Add address with postcode lookup
- [ ] Set default address
- [ ] Add products to cart
- [ ] Checkout using saved address
- [ ] View order confirmation
- [ ] View order list at `/orders`
- [ ] Email queued/sent on order

### As Farm User
- [ ] View orders at `/farm-portal/orders`
- [ ] Filter orders by status
- [ ] Update order status
- [ ] Add/edit products with images
- [ ] Edit farm profile with hero image

### As Admin
- [ ] View all orders at `/admin/orders`
- [ ] Filter orders by status/farm
- [ ] Update any order status
- [ ] Add internal notes on orders
- [ ] View all farms at `/admin/farms`
- [ ] Approve/suspend farms
- [ ] View users at `/admin/users`

### Address Lookup
- [ ] Postcode lookup works (postcodes.io)
- [ ] Manual entry fallback works
- [ ] Address saved to addresses table

---

## Phase E: Split Platform Experience

Phase E introduces a complete separation of the customer and farm experiences, treating them as two different "apps" with distinct layouts, navigation, and onboarding flows.

### Key Changes

1. **Role-First Signup:** Users choose "Buy Meat" (customer) or "Sell Meat" (farm) before signing up
2. **Separate Layouts:** Customer marketplace vs Farm seller portal have distinct visual identities
3. **Farm Onboarding Wizard:** 5-step wizard for new farm sellers
4. **Role-Based Middleware:** Routes are protected based on user role
5. **Marketing Landing Page:** `/sell` page to attract new farm sellers

### Route Structure

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Marketplace homepage |
| `/farms` | Public | Browse all farms |
| `/farm/[slug]` | Public | Farm profile |
| `/sell` | Public | Farm seller marketing page |
| `/signup` | Public | Role-first signup flow |
| `/login` | Public | Login (redirects by role) |
| `/cart`, `/checkout` | Customer | Shopping experience |
| `/orders` | Customer | Customer order history |
| `/account` | Customer | Customer account settings |
| `/farm-portal` | Farm | Seller dashboard home |
| `/farm-portal/orders` | Farm | Farm order management |
| `/farm-portal/products` | Farm | Product management |
| `/farm-portal/profile` | Farm | Farm profile editing |
| `/farm-portal/onboarding` | Farm | New farm setup wizard |
| `/admin/*` | Admin | Admin dashboard |

### Phase E Test Flow

#### 1. Public Browsing (Logged Out)
- [ ] Visit `/` - See farm feed
- [ ] Click a farm - See farm profile and products
- [ ] Visit `/sell` - See farm seller landing page

#### 2. Customer Signup Flow
1. Go to `/signup`
2. Click "I want to buy meat"
3. Fill out name, email, password
4. Check email for confirmation link
5. After confirming, you're redirected to marketplace
6. Browse farms, add to cart, checkout
7. View orders at `/orders`
8. Manage addresses at `/account/addresses`

#### 3. Farm Signup Flow
1. Go to `/signup` (or `/sell` → "Get Started")
2. Click "I want to sell meat"
3. Fill out name, email, password
4. Check email for confirmation link
5. After confirming, you're redirected to `/farm-portal/onboarding`
6. Complete 5-step wizard:
   - Step 1: Farm name, slug, description
   - Step 2: Farm address and delivery postcodes
   - Step 3: Delivery days, cutoff time, fees
   - Step 4: Add at least 1 product
   - Step 5: Upload hero image (optional)
7. Farm is created with `status = 'pending'`
8. You see "Pending Review" badge in farm portal

#### 4. Admin Approval
1. Log in as admin
2. Go to `/admin/farms`
3. Find the pending farm
4. Click "Approve"
5. Farm now appears on marketplace

#### 5. Role Enforcement
- [ ] Customer trying to access `/farm-portal` → Redirected to `/`
- [ ] Farm user trying to access `/account` → Redirected to `/farm-portal`
- [ ] Non-admin trying to access `/admin` → Redirected to their home

### Creating Test Users

**Customer:**
1. Go to `/signup` → Choose "Buy Meat"
2. Or directly: `/signup?role=customer`

**Farm:**
1. Go to `/signup` → Choose "Sell Meat"
2. Or directly: `/signup?role=farm`

**Admin:**
```sql
-- In Supabase SQL Editor, after creating a user:
UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID_HERE';
```

### Quick Dev Testing (Skip Email)

For faster testing, disable email confirmation:
1. Supabase Dashboard → Authentication → Providers → Email
2. Uncheck "Confirm email"
3. Save

Now signup completes instantly without email verification.

---

## Phase E Add-on: Admin Console & Role-Based Routing

This add-on builds on Phase E with an enhanced admin console, automatic admin promotion via email allowlist, and improved role-based routing.

### New Features

1. **Admin Email Allowlist:** Admins are auto-promoted based on emails in `ADMIN_EMAILS` env var
2. **Role-Based Post-Login Routing:** Users go directly to their app after login (no landing page)
3. **Enhanced Admin Console:** High-quality dashboard with KPIs, order/farm/user management
4. **Farm Order Tracking Polish:** Better UX for farm order management with status tracking

### Environment Configuration

Add to your `.env.local`:

```env
# Admin Email Allowlist (comma-separated)
# Users with these emails are automatically promoted to admin on login
ADMIN_EMAILS=admin@example.com,superadmin@example.com
```

**Notes:**
- Emails are case-insensitive and trimmed
- Users are only promoted, never demoted (avoids accidental lockouts)
- Sync happens on login and via `/api/auth/sync-role` endpoint

### Role-Based Routing After Login

| Role | Redirect After Login |
|------|---------------------|
| Customer | `/farms` (browse marketplace) |
| Farm | `/farm-portal` (seller dashboard) |
| Admin | `/admin` (admin console) |

**Important:** The homepage (`/`) redirects logged-in users to their app. The landing page is only shown to logged-out visitors.

### Admin Console Overview

Visit `/admin` to access the admin console. Pages include:

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard with KPIs, activity feed, action items |
| `/admin/orders` | Order management with filters (status, farm, date range) |
| `/admin/orders/[id]` | Order details with status updater and timeline |
| `/admin/farms` | Farm management with approve/suspend actions |
| `/admin/farms/[id]` | Farm details with products and recent orders |
| `/admin/users` | User list with role badges |
| `/admin/emails` | Email outbox with status tracking |
| `/admin/settings` | Platform settings (placeholder) |

### Creating an Admin User

**Option 1: Email Allowlist (Recommended)**

1. Add email to `ADMIN_EMAILS` in `.env.local`:
   ```env
   ADMIN_EMAILS=youremail@example.com
   ```
2. Restart the dev server
3. Log in with that email
4. User is automatically promoted to admin

**Option 2: Manual SQL**

```sql
-- In Supabase SQL Editor
UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID_HERE';
```

### Testing Role-Based Flow

#### 1. Customer Flow
1. Log in as a customer
2. Verify redirect to `/farms`
3. Verify cannot access `/farm-portal` or `/admin`

#### 2. Farm Flow
1. Log in as a farm user
2. Verify redirect to `/farm-portal`
3. Test order management:
   - View orders list with status filters
   - Click order to see details
   - Update order status (uses workflow: processing → confirmed → preparing → ready → delivered)
   - Add notes to orders
4. Verify cannot access `/admin`

#### 3. Admin Flow
1. Log in with email in `ADMIN_EMAILS`
2. Verify redirect to `/admin`
3. Test admin console:
   - View dashboard KPIs
   - Browse orders with filters
   - Update order status from admin view
   - Approve/suspend farms
   - View users list

### Farm Order Status Workflow

Farms can update orders through this workflow:

```
processing → confirmed → preparing → ready_for_pickup → out_for_delivery → delivered
```

At each step:
- Status is updated in `orders` table
- Event is logged to `order_events` table with optional note
- Customer can see status changes on their order page

### Quick Test Checklist

- [ ] Set `ADMIN_EMAILS` env var with your email
- [ ] Log in → Redirected to `/admin`
- [ ] Admin dashboard shows KPIs
- [ ] Admin can view and filter orders
- [ ] Admin can approve/suspend farms
- [ ] Log out and log in as customer → Redirected to `/farms`
- [ ] Log out and log in as farm → Redirected to `/farm-portal`
- [ ] Farm can view and update order status
- [ ] Homepage redirects logged-in users to their app

### Troubleshooting

**Admin not promoted despite email in allowlist:**
- Restart the dev server after changing `ADMIN_EMAILS`
- Ensure email matches exactly (spaces, case don't matter)
- Check server logs for `[sync-role]` messages

**Orders not showing in admin:**
- Check RLS policies allow admin read
- Verify the user's `profiles.role` is `admin`

**Farm portal not showing orders:**
- Ensure farm has `status = 'approved'`
- Check that orders have the correct `farm_id`
- Run `pnpm selfcheck` to verify database state

---

## Discreet Admin Signup

Farmlink includes a discreet way for admins to self-register during signup without exposing obvious admin UI.

### How It Works

1. On the signup page, click the subtle "Have an invite code?" link at the bottom of the form
2. Enter the exact admin claim code: `FARMADMIN26`
3. Complete signup normally (choose any role - it will be overridden to admin)
4. After email confirmation, you'll be redirected to `/admin`

### Configuration

Set the following environment variable:

```env
ADMIN_CLAIM_CODE=FARMADMIN26
```

**Security Notes:**
- The code is validated server-side only (never exposed in client bundle)
- Rate limited: 5 attempts per IP per 15 minutes, 3 attempts per email per hour
- Audit events are logged server-side
- Invalid codes show a generic "Invalid access code" message (no hints)
- The admin claim endpoint (`/api/admin/claim`) validates the code securely

### Alternative: Email Allowlist

You can also auto-promote users to admin based on email:

```env
ADMIN_EMAILS=admin@example.com,superadmin@example.com
```

Users with matching emails are automatically promoted to admin on login.

### Testing Admin Access

1. Sign up with a new account
2. Click "Have an invite code?" and enter `FARMADMIN26`
3. Complete signup and verify email
4. On first login, you should be redirected to `/admin`
5. Or use the email allowlist approach instead

---

## Security Checklist

- [ ] Service role key not exposed to client
- [ ] `.env.local` in `.gitignore`
- [ ] Auth URLs configured correctly
- [ ] RLS enabled on all tables
- [ ] Webhook signatures verified (when using Stripe)
- [ ] Admin routes protected by middleware
- [ ] Role-based route protection in middleware
- [ ] Upload paths verified (farm can only upload to their folder)
- [ ] Farm onboarding creates farm with `status='pending'` (not public until approved)
- [ ] `ADMIN_CLAIM_CODE` is a strong secret (not easily guessable)
- [ ] Admin claim rate limiting is enabled

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Stripe Docs:** https://stripe.com/docs
- **Vercel Docs:** https://vercel.com/docs
