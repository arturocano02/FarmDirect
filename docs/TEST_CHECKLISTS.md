# Test Checklists - FairFarm

## Manual Test Checklists

### 1. Anonymous Browsing (Public Access)

**Goal:** Verify logged-out users can browse farms without authentication.

**Steps:**
1. Open browser in incognito/private mode
2. Visit `http://localhost:3001/`
3. Verify homepage loads with farm feed
4. Click on a farm card
5. Verify farm detail page loads (`/farm/[slug]`)
6. Verify products are visible
7. Verify images load correctly (no 404s in console)
8. Try to add product to cart
9. Verify auth modal appears (ordering requires login)

**Expected Results:**
- ✅ Homepage shows farm listings
- ✅ Farm detail pages load
- ✅ Images display correctly
- ✅ No console errors for `/_next/image` 404s
- ✅ Cart requires authentication

---

### 2. Customer Experience

**Goal:** Verify customer can browse, order, and manage account.

**Steps:**
1. Sign up as customer (`/signup` → "I want to buy meat")
2. Verify redirect to `/farms` after login
3. Browse farms, view products
4. Add products to cart
5. Go to `/cart`, verify items appear
6. Proceed to `/checkout`
7. Complete order
8. View order at `/orders`
9. Access `/account` settings
10. Try to access `/farm-portal` → should redirect to `/farms`
11. Try to access `/admin` → should redirect to `/farms`

**Expected Results:**
- ✅ Customer can browse and order
- ✅ Cannot access farm portal or admin
- ✅ Images load correctly
- ✅ No upload errors

---

### 3. Farm Portal - Editing

**Goal:** Verify farms can edit their profile, manage products, and upload assets.

**Steps:**
1. Sign up as farm user (`/signup` → "I want to sell meat")
2. Complete farm setup wizard at `/farm-portal/setup`
3. After setup, verify redirect to `/farm-portal` dashboard
4. Go to `/farm-portal/profile`
5. Edit farm name, description, story
6. Upload hero image → verify upload succeeds
7. Upload logo → verify upload succeeds
8. Upload story video → verify upload succeeds (if implemented)
9. Save changes → verify success message
10. Go to `/farm-portal/products`
11. Add new product with image → verify upload succeeds
12. Edit existing product
13. Deactivate/activate product
14. Go to `/farm-portal/orders` → verify orders list loads
15. Try to access `/admin` → should redirect to `/farm-portal`

**Expected Results:**
- ✅ Farm can edit all profile fields
- ✅ Image uploads work (no 500 errors)
- ✅ Video uploads work (if implemented)
- ✅ Products can be managed
- ✅ Cannot access admin console

---

### 4. Admin Console - Management

**Goal:** Verify admins can manage farms, users, and orders.

**Steps:**
1. Set `ADMIN_EMAILS=youremail@example.com` in `.env.local`
2. Restart dev server
3. Log in with admin email
4. Verify redirect to `/admin`
5. Go to `/admin/farms`
6. Click on a farm → verify detail page loads
7. Click "Edit Farm Details" → verify form appears
8. Edit farm name, description → save → verify success
9. Change farm status (approve/suspend) → verify status updates
10. Go to `/admin/users`
11. Click edit icon on a user → change role → verify role updates
12. Try to change your own role → verify blocked (safety check)
13. Go to `/admin/orders`
14. Filter orders by status, farm, date
15. Click on an order → verify detail page loads
16. Update order status → verify status updates
17. Try to access `/farm-portal` → should still work (admin can access)

**Expected Results:**
- ✅ Admin can edit farm details
- ✅ Admin can change farm status
- ✅ Admin can change user roles
- ✅ Admin cannot change own role
- ✅ Admin can manage orders
- ✅ All admin pages load without errors

---

### 5. Upload System

**Goal:** Verify uploads work for all asset types.

**Steps:**
1. Log in as farm user
2. Go to `/farm-portal/profile`
3. Upload hero image (JPG, < 5MB) → verify success
4. Upload logo (PNG, < 5MB) → verify success
5. Upload story video (MP4, < 50MB) → verify success
6. Verify images/videos appear in UI
7. Go to `/farm-portal/products/new`
8. Upload product image → verify success
9. Create product → verify image URL saved
10. View public farm page → verify all media displays
11. Test invalid uploads:
    - File too large → verify error message
    - Wrong file type → verify error message
    - Unauthenticated request → verify 401

**Expected Results:**
- ✅ All uploads succeed (no 500 errors)
- ✅ Files stored in correct buckets
- ✅ URLs saved to database
- ✅ Media displays on public pages
- ✅ Error messages are clear

---

### 6. Image Display & Next/Image

**Goal:** Verify images load correctly without 404s.

**Steps:**
1. Visit homepage (logged out)
2. Check browser console for `/_next/image` 404 errors
3. Click on farms with images → verify images load
4. Check Network tab → verify images load from Supabase
5. Visit farm detail pages → verify hero images load
6. Verify product images load
7. Test with farms that have no images → verify placeholders show
8. Check for LCP warnings in console

**Expected Results:**
- ✅ No `/_next/image` 404 errors
- ✅ Images load from Supabase storage
- ✅ Placeholders show for missing images
- ✅ No LCP warnings for above-fold images

---

### 7. Runtime Warnings

**Goal:** Verify known warnings are documented and don't break functionality.

**Steps:**
1. Open browser console
2. Load homepage
3. Check for "Extra attributes" warning (Grammarly)
4. Verify warning is harmless (documented in DEVELOPER_NOTES.md)
5. Check for React hydration errors
6. Verify no "Invalid hook call" errors
7. Check for Next/Image warnings

**Expected Results:**
- ✅ Grammarly warning is present but harmless
- ✅ No React hydration errors
- ✅ No hook call errors
- ✅ No critical warnings

---

## Automated Test Scripts

### Test 1: Non-admin Cannot Access Admin Routes

```bash
# Test script (manual verification)
curl -X GET http://localhost:3001/admin \
  -H "Cookie: your-customer-session-cookie" \
  -v

# Expected: 302 redirect to /farms or 403
```

### Test 2: Upload Rejects Unauthenticated Requests

```bash
# Test script
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test-image.jpg" \
  -F "bucket=farm-images" \
  -F "path=test/test.jpg" \
  -v

# Expected: 401 Unauthorized
```

### Test 3: Public Farms Endpoint Returns Approved Farms

```bash
# Test script
curl http://localhost:3001/api/health/public-farms | jq

# Expected: { "ok": true, "approvedFarmCount": > 0 }
```

---

## Verification Commands

Run these commands to verify the build:

```bash
# Lint check
pnpm lint

# Type check
pnpm typecheck

# Build
pnpm build

# Dev server (verify no crashes)
pnpm dev
```

**Expected:** All commands pass without errors.

---

## Known Limitations

1. **Video Support:** Product videos are not yet implemented (only farm story videos)
2. **Self-Demotion Protection:** Admins cannot change their own role (safety feature)
3. **Image Optimization:** Large images may take time to optimize on first load
4. **Video Size:** Videos are limited to 50MB (configurable in upload route)

---

## Troubleshooting

### Upload 500 Error
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify storage buckets exist in Supabase
- Check RLS policies allow service role writes

### Image 404 Error
- Verify Supabase URL pattern in `next.config.mjs`
- Check image URLs are not undefined/empty
- Verify storage bucket is public

### Admin Access Denied
- Check `ADMIN_EMAILS` includes your email
- Verify `profiles.role = 'admin'` in database
- Restart dev server after changing env vars
