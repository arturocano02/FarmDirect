# Farm Portal Audit Report

**Date:** January 2026  
**Status:** ✅ Mostly Implemented

## 1. Existing Farm Routes

### Pages Found

| Route | File | Status |
|-------|------|--------|
| `/farm` | `src/app/farm/page.tsx` | ✅ Redirects to `/farm-portal` |
| `/farm-portal` | `src/app/farm-portal/page.tsx` | ✅ Dashboard with KPIs |
| `/farm-portal/orders` | `src/app/farm-portal/orders/page.tsx` | ✅ Orders list with filters |
| `/farm-portal/orders/[id]` | `src/app/farm-portal/orders/[id]/page.tsx` | ✅ Order detail + status updater |
| `/farm-portal/products` | `src/app/farm-portal/products/page.tsx` | ✅ Products list |
| `/farm-portal/products/new` | `src/app/farm-portal/products/new/page.tsx` | ✅ Create product |
| `/farm-portal/products/[id]/edit` | `src/app/farm-portal/products/[id]/edit/page.tsx` | ✅ Edit product |
| `/farm-portal/profile` | `src/app/farm-portal/profile/page.tsx` | ✅ Farm settings form |
| `/farm-portal/onboarding` | `src/app/farm-portal/onboarding/page.tsx` | ✅ Multi-step wizard |
| `/farm-portal/setup` | `src/app/farm-portal/setup/page.tsx` | ⚠️ Placeholder only |
| `/farm-portal/payouts` | - | ❌ Not implemented |

### Components Found

- `src/app/farm-portal/layout.tsx` - Layout with sidebar navigation
- `src/app/farm-portal/farm-nav.tsx` - Navigation component (client)
- `src/app/farm-portal/products/product-form.tsx` - Product form (client)
- `src/app/farm-portal/profile/farm-profile-form.tsx` - Farm profile form (client)
- `src/app/farm-portal/onboarding/onboarding-wizard.tsx` - 5-step wizard (client)
- `src/app/farm-portal/orders/[id]/farm-order-status-updater.tsx` - Status updater (client)

### API Routes Found

| Route | File | Status |
|-------|------|--------|
| `GET/PUT /api/farm/profile` | `src/app/api/farm/profile/route.ts` | ✅ Working |
| `POST /api/farm/products` | `src/app/api/farm/products/route.ts` | ✅ Working |
| `PUT/DELETE /api/farm/products/[id]` | `src/app/api/farm/products/[id]/route.ts` | ✅ Working |
| `POST /api/farm/orders/[id]/status` | `src/app/api/farm/orders/[id]/status/route.ts` | ✅ Working |

## 2. Data Functions

- `src/lib/data/farms.ts` - Farm data functions (getApprovedFarms, getFarmBySlug)
- `src/lib/data/products.ts` - Product data functions
- Server Supabase client: `src/lib/supabase/server.ts` - Uses anon key with cookies

## 3. Middleware / Routing

**File:** `src/middleware.ts`

### Current Behavior:
1. Farm routes are defined as `"/farm-portal"` in `FARM_ROUTES`
2. Farm users are redirected to `/farm-portal/onboarding` if no farm row exists
3. Customer users cannot access `/farm-portal/*` (redirected to `/farms`)
4. Farm users cannot access customer routes like `/checkout`, `/account` (redirected to `/farm-portal`)

### Role Detection:
- Uses `getEffectiveRole()` from `src/lib/auth/roles.ts`
- Checks `profiles.role` in database
- Falls back to `user_metadata.role`
- Supports admin allowlist override

## 4. Root Cause Analysis

### "Why wasn't farm dashboard showing?"

**Finding:** The farm dashboard IS working correctly. 

The implementation follows the expected flow:
1. User signs up with role='farm' 
2. Middleware detects farm role, redirects to `/farm-portal`
3. If no farm row exists, redirects to `/farm-portal/onboarding`
4. Onboarding wizard creates farm + products
5. After creation, user can access `/farm-portal` dashboard

**Potential confusion sources:**
- `/farm/page.tsx` redirects to `/farm-portal`, not `/farm/dashboard` as the requirements mentioned
- The actual farm dashboard is at `/farm-portal`, not `/farm/dashboard`
- The setup page at `/farm-portal/setup` is a placeholder, while the actual setup is `/farm-portal/onboarding`

## 5. What Was Missing

| Feature | Status | Fix Required |
|---------|--------|--------------|
| Payouts page | ❌ Missing | Implement `/farm-portal/payouts` |
| Payouts nav link | ❌ Missing | Add to `farm-nav.tsx` |
| Order events actor fields | ⚠️ Partial | Client component doesn't pass `actor_role`, `actor_user_id` |
| Farm notifications toggle | ❌ Missing | Add to farm profile |

## 6. Fixes Applied

### 1. Added Payouts Page
- Created `src/app/farm-portal/payouts/page.tsx`
- Created migration for `farm_payouts` table
- UI shows "Payments not live yet" with form to collect bank details

### 2. Updated Navigation
- Added Payouts link to `farm-nav.tsx`

### 3. Fixed Order Status Updater
- Updated `farm-order-status-updater.tsx` to use server action with proper audit fields

### 4. Added Farm Notifications Toggle
- Added `receive_order_emails` field to farm profile form

## 7. Security Verification

✅ Farm can only access their own farm row (RLS + owner_user_id check)  
✅ Farm can only access their own orders (farm_id check in queries)  
✅ Farm can only access their own products (farm_id check in queries)  
✅ Server-side Supabase client used for data fetching  
✅ Client components only do writes through API routes or server actions  
✅ Service role key not exposed to client  

## 8. RLS Policies

Verified policies exist for:
- `farms` - Owner can read/update their own farm
- `products` - Farm owner can CRUD their products  
- `orders` - Farm can read orders where `farm_id` matches their farm
- `order_events` - Farm can insert events for their orders

## 9. Testing Checklist

See `docs/farm-verification.md` for complete testing instructions.
