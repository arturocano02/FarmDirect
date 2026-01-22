# Audit & Fix Report - FairFarm

**Date:** January 2026  
**Scope:** Admin console, farm portal, uploads, images, runtime warnings

## Step 1: Audit Findings

### A. Route Structure

#### Admin Routes (✅ Exist)
- `/admin` - Dashboard with KPIs
- `/admin/orders` - Order management (with filters)
- `/admin/orders/[id]` - Order detail with status updater
- `/admin/farms` - Farm list with status filters
- `/admin/farms/[id]` - Farm detail (read-only, no edit)
- `/admin/users` - User list (read-only, no role editing)
- `/admin/emails` - Email outbox
- `/admin/settings` - Settings placeholder

**Missing:** Admin edit capabilities for farms and users

#### Farm Portal Routes (✅ Exist)
- `/farm-portal` - Dashboard
- `/farm-portal/setup` - Setup wizard (✅ Implemented)
- `/farm-portal/profile` - Farm profile editor (✅ Exists)
- `/farm-portal/products` - Product list
- `/farm-portal/products/new` - Create product
- `/farm-portal/products/[id]/edit` - Edit product
- `/farm-portal/orders` - Orders list
- `/farm-portal/orders/[id]` - Order detail
- `/farm-portal/payouts` - Payouts settings

**Status:** All routes exist and are functional

#### Public Routes (✅ Exist)
- `/` - Landing page (redirects logged-in users)
- `/farms` - Farm browse
- `/farm/[slug]` - Farm profile

### B. Auth & Role Resolution

**Role Storage:**
- Primary: `profiles.role` (database)
- Fallback: `user.user_metadata.role`
- Admin allowlist: `ADMIN_EMAILS` env var (comma-separated)

**Role Detection:**
- `src/lib/auth/roles.ts` - Centralized role logic
- `getEffectiveRole()` - Determines effective role
- `isEmailAdminAllowlisted()` - Checks email allowlist

**Admin Gating:**
- Middleware checks role before allowing `/admin/*`
- Admin layout (`src/app/admin/layout.tsx`) verifies admin role server-side
- Uses `getEffectiveRole()` for consistency

### C. Database Schema

**Farms Table:**
- ✅ `hero_image_url` (TEXT, nullable)
- ✅ `logo_url` (TEXT, nullable)
- ❌ `story_video_url` (MISSING - needs migration)

**Products Table:**
- ✅ `image_url` (TEXT, nullable)
- ❌ `video_url` (MISSING - optional, not critical)

**Status:** Video fields missing, need migration

### D. Storage Buckets

**Existing:**
- ✅ `farm-images` - Public read, authenticated write (RLS policies exist)
- ✅ `product-images` - Public read, authenticated write (RLS policies exist)

**Missing:**
- ❌ `farm-videos` - For story videos
- ❌ `product-videos` - For product videos (optional)

**Policies:** RLS policies exist but may block uploads if using anon key

### E. Upload System

**Current Implementation:**
- Route: `/api/upload` (`src/app/api/upload/route.ts`)
- Uses: `createClient()` (anon key with cookies)
- **Problem:** RLS policies may block uploads, causing 500 errors
- **Solution:** Use service role client for uploads

**Allowed:**
- Buckets: `farm-images`, `product-images`
- Types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max size: 5MB

**Missing:**
- Video support (types, buckets)
- Better error messages

### F. Image Configuration

**Next.js Config:**
- ✅ Has `remotePatterns` for Supabase
- Pattern: `*.supabase.co` with `/storage/v1/object/public/**`
- ✅ Has `images.unsplash.com`

**Potential Issues:**
- May need exact domain instead of wildcard
- Image URLs may be undefined/empty causing 404s

### G. Runtime Warnings Analysis

1. **Extra attributes (data-new-gr-c-s-check-loaded)**
   - **Cause:** Browser extensions (Grammarly)
   - **Fix:** Document, ignore (not a code issue)

2. **Next/Image LCP warning**
   - **Cause:** Hero image on homepage missing `priority`
   - **Fix:** Add `priority` prop to above-fold hero image

3. **Next/Image 404**
   - **Cause:** Invalid URLs or missing remote pattern
   - **Fix:** Verify Supabase URL pattern, add fallbacks

4. **Upload 500**
   - **Cause:** RLS blocking uploads with anon key
   - **Fix:** Use service role client for uploads

## Step 2: Root Causes

| Error | Root Cause | Fix Required |
|-------|-----------|--------------|
| Extra attributes warning | Browser extensions | Document only |
| LCP warning | Missing `priority` on hero | Add `priority` prop |
| Image 404 | Invalid URLs or config | Fix URLs, add fallbacks |
| Upload 500 | RLS blocking anon uploads | Use service role client |

## Step 3: Implementation Plan

1. ✅ Fix Next/Image config and add priority
2. ✅ Fix upload route to use service role
3. ✅ Add video support (migration + UI)
4. ✅ Add admin edit capabilities
5. ✅ Verify farm editing works
6. ✅ Add test checklists
