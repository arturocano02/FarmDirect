# Farm Portal Verification Guide

This document describes how to test the farm owner experience in FairFarm.

## Prerequisites

- Development server running: `pnpm dev`
- Database migrations applied (including `00008_farm_payouts_and_notifications.sql`)
- At least one test user email available

---

## 1. Create a Farm User

### Via Signup

1. Go to `http://localhost:3000/signup`
2. Select "I want to sell" (role: farm)
3. Enter name, email, password
4. Confirm email (check Supabase auth logs or use instant signup)
5. **Expected**: Redirected to `/farm-portal/onboarding`

### Via Database (for testing)

```sql
-- In Supabase SQL Editor
UPDATE profiles SET role = 'farm' WHERE id = 'USER_ID_HERE';
```

---

## 2. Complete Farm Onboarding

1. After signup, you should see the onboarding wizard at `/farm-portal/onboarding`
2. Fill in:
   - **Step 1**: Farm name, slug, short description
   - **Step 2**: Address, postcode, delivery area
   - **Step 3**: Delivery days, cutoff time, min order, delivery fee
   - **Step 4**: At least one product (name + price required)
   - **Step 5**: Optional hero image
3. Click "Create My Farm"
4. **Expected**: Redirected to `/farm-portal` with success state

### Verify Farm Created

```sql
-- In Supabase SQL Editor
SELECT id, name, slug, status, owner_user_id FROM farms WHERE owner_user_id = 'USER_ID';
-- Should show status = 'pending'
```

---

## 3. Farm Dashboard

1. Navigate to `/farm-portal`
2. **Expected**:
   - KPI cards showing: Total Orders, Pending Orders, Active Products, Revenue
   - Status banner if farm is "pending" or "suspended"
   - Recent orders list (may be empty)
   - Links work: clicking cards navigates to relevant pages

---

## 4. Products Management

### View Products

1. Click "Products" in sidebar or navigate to `/farm-portal/products`
2. **Expected**: Grid of product cards (or empty state with "Add Product" button)

### Add Product

1. Click "Add Product" button
2. Fill in: name, price, description, unit label
3. Upload optional image
4. Toggle "Active" checkbox
5. Click "Create Product"
6. **Expected**: Redirected to products list, new product appears

### Edit Product

1. Click "Edit" on a product card
2. Modify fields
3. Click "Save Changes"
4. **Expected**: Changes saved, redirected to list

### Deactivate Product

1. Edit a product
2. Uncheck "Active"
3. Save
4. **Expected**: Product shows "Inactive" badge in list

---

## 5. Orders Management

### Seed Test Order (if none exist)

For testing, you may need to create an order as a customer first.

### View Orders

1. Click "Orders" in sidebar or navigate to `/farm-portal/orders`
2. **Expected**:
   - Status filter chips (All, New, Confirmed, etc.)
   - Orders table with: order number, customer, status, delivery, total, date
   - Empty state if no orders

### Filter Orders

1. Click a status chip (e.g., "Processing")
2. **Expected**: Only orders with that status shown

### View Order Detail

1. Click an order number or "View" button
2. **Expected**: Full order detail page showing:
   - Order items with prices
   - Delivery address
   - Customer info
   - Order timeline (events)
   - Status updater widget

### Update Order Status

1. On order detail page, click the primary action button (e.g., "Confirm Order")
2. **Expected**:
   - Status updates immediately
   - Success message shows briefly
   - Timeline shows new event

### Verify Order Event Created

```sql
-- In Supabase SQL Editor
SELECT * FROM order_events WHERE order_id = 'ORDER_ID' ORDER BY created_at DESC;
-- Should show:
-- - actor_role = 'farm'
-- - actor_user_id = your user ID
-- - status_from and status_to populated
```

---

## 6. Farm Profile Settings

1. Click "Farm Profile" in sidebar or navigate to `/farm-portal/profile`
2. **Expected**: Form with all farm settings:
   - Hero image upload
   - Basic info (name, description, story, contact email)
   - Address fields
   - Badges selection
   - Delivery settings (days, postcodes, cutoff, fees)
   - Notifications toggle

### Update Profile

1. Change any field
2. Click "Save Changes"
3. **Expected**: Success message, changes persist on reload

---

## 7. Payouts (Placeholder)

1. Click "Payouts" in sidebar or navigate to `/farm-portal/payouts`
2. **Expected**:
   - "Payments Coming Soon" banner
   - Placeholder stats cards (all £0.00)
   - Bank account form
   - FAQ section

### Save Bank Details

1. Fill in: Account holder name, sort code, account number
2. Click "Save Bank Details"
3. **Expected**: 
   - Success message
   - Shows "Bank account saved" with last 4 digits
   - Only last 4 digits stored in database

### Verify Payout Settings

```sql
SELECT * FROM farm_payouts WHERE farm_id = 'FARM_ID';
-- Should show account_number_last4 (only 4 digits), not full number
```

---

## 8. RLS / Access Control Tests

### Another Farm Cannot Access This Farm

1. Create a second farm user
2. Try to navigate to first farm's order: `/farm-portal/orders/ORDER_ID`
3. **Expected**: 404 or redirect (not the order data)

### Customer Cannot Access Farm Portal

1. Log in as a customer (role: customer)
2. Navigate to `/farm-portal`
3. **Expected**: Redirected to `/farms`

### Farm Cannot Access Admin

1. Log in as farm user
2. Navigate to `/admin`
3. **Expected**: Redirected away (to `/farm-portal`)

### Farm Cannot Access Customer Routes

1. Log in as farm user
2. Navigate to `/checkout`
3. **Expected**: Redirected to `/farm-portal`

---

## 9. Verification Commands

```bash
# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Build the app
pnpm build

# Start dev server
pnpm dev
```

---

## 10. Test Checklist

| Test | Status |
|------|--------|
| Farm signup creates profile with role='farm' | ☐ |
| Farm without farm row redirects to onboarding | ☐ |
| Onboarding wizard creates farm + products | ☐ |
| Dashboard shows KPIs | ☐ |
| Products CRUD works | ☐ |
| Orders list loads | ☐ |
| Order status update creates order_events with actor_role='farm' | ☐ |
| Farm profile saves all fields | ☐ |
| Notifications toggle works | ☐ |
| Payouts form saves bank details (last 4 only) | ☐ |
| Other farms cannot see my orders | ☐ |
| Customers cannot access /farm-portal | ☐ |
| Farms cannot access /admin | ☐ |
| pnpm lint passes | ☐ |
| pnpm typecheck passes | ☐ |
| pnpm build passes | ☐ |

---

## Troubleshooting

### "Farm not found" error

- Check that the logged-in user has `role='farm'` in profiles table
- Check that a farm row exists with `owner_user_id` matching the user ID

### Orders not showing

- Verify orders exist with the correct `farm_id`
- Check RLS policies allow farm to read their orders

### Status update fails

- Check browser console for errors
- Check server logs for RLS violations
- Verify `order_events` table exists and RLS policies are correct

### Bank details not saving

- Ensure `farm_payouts` table exists (migration 00008)
- Check RLS policies on `farm_payouts`
