# Farm Profile Update Fix

**Date:** January 2026  
**Issue:** POST `/api/farm/profile` returning 500 Internal Server Error

## Root Cause

The Zod validation schema was rejecting empty strings (`""`) for URL fields (`hero_image_url`, `logo_url`, `story_video_url`). The form sends empty strings when these fields are not set, but the schema expected either:
- A valid URL string, or
- `null`

Empty strings failed the `.url()` validation, causing the validation to fail and return a 500 error.

Additionally:
- Error messages were generic ("Failed to update profile") without actual error details
- No field whitelisting (could accept unexpected fields)
- Next/Image warning about missing `sizes` prop

## Fix Applied

### 1. Updated Zod Schema (`src/app/api/farm/profile/route.ts`)

**Changed:**
- Added `z.preprocess()` to normalize empty strings to `null` before validation
- Applied preprocessing to all nullable string fields (short_description, story, address, postcode, cutoff_time, contact_email)
- Created `urlOrNull` helper for URL fields that accepts empty strings and converts to null

**Before:**
```typescript
hero_image_url: z.string().url().nullable().optional(),
```

**After:**
```typescript
const urlOrNull = z.preprocess(
  (val) => (val === "" || val === null ? null : val),
  z.string().url().nullable()
);
hero_image_url: urlOrNull.optional(),
```

### 2. Enhanced Error Handling

**Added:**
- Field whitelisting to only accept allowed fields
- Detailed error logging in development mode
- Proper error status codes (400 for validation, 403 for permission, 409 for conflicts)
- Return actual error messages instead of generic ones

**Before:**
```typescript
if (updateError) {
  console.error("[api/farm/profile] Update error:", updateError);
  return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
}
```

**After:**
```typescript
if (updateError) {
  if (process.env.NODE_ENV === "development") {
    console.error("[api/farm/profile] Update error:", {
      error: updateError,
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      farmId,
      userId: user.id,
    });
  }
  
  const status = updateError.code === "PGRST301" || updateError.code === "42501" 
    ? 403 
    : updateError.code === "23505" 
      ? 409 
      : 400;

  return NextResponse.json(
    { 
      ok: false, 
      error: updateError.message || "Failed to update profile",
      code: updateError.code 
    },
    { status }
  );
}
```

### 3. Fixed Client Error Handling

**Changed:**
- Parse response once (not twice)
- Check both `response.ok` and `data.ok`
- Log errors in development mode for debugging

### 4. Fixed Next/Image Warning

**Added:**
- `sizes` prop to Image component with `fill` prop
- Value: `"(max-width: 768px) 100vw, 192px"` (matches the 192px width of the preview)

## Files Changed

1. `src/app/api/farm/profile/route.ts` - Fixed validation and error handling
2. `src/app/farm-portal/profile/farm-profile-form.tsx` - Fixed response parsing and added Image sizes

## Test Results

### Test 1: Text Field Update
- **Action:** Changed farm name only
- **Result:** ✅ 200 OK, profile updated successfully
- **UI:** Success message displayed

### Test 2: Numeric Fields
- **Action:** Updated min_order_value and delivery_fee
- **Result:** ✅ 200 OK, values saved correctly (converted to pence)
- **UI:** Success message displayed

### Test 3: Array Fields
- **Action:** Updated delivery_days, badges, postcode_rules
- **Result:** ✅ 200 OK, arrays saved correctly
- **UI:** Success message displayed

### Test 4: Empty URL Fields
- **Action:** Left hero_image_url and logo_url empty (empty strings)
- **Result:** ✅ 200 OK, null values saved correctly
- **UI:** Success message displayed

### Test 5: Public Farm Browsing
- **Action:** Visited homepage and farm detail pages (logged out)
- **Result:** ✅ Farms load correctly, no new errors
- **UI:** All images display properly

### Test 6: Admin Dashboard
- **Action:** Accessed `/admin` as admin user
- **Result:** ✅ Dashboard loads correctly
- **UI:** No errors

### Test 7: Unauthenticated Request
- **Action:** Called API without authentication
- **Result:** ✅ 401 Unauthorized with proper error message

### Test 8: Farm User Without Farm
- **Action:** Simulated farm user with no farm row (commented check)
- **Result:** ✅ 404 Not Found with "Farm not found" message

## Verification Commands

```bash
pnpm lint      # ✅ Pass
pnpm typecheck # ✅ Pass
pnpm build     # ✅ Pass
```

## Summary

The fix addresses the root cause (empty string validation) while maintaining all existing functionality. The changes are minimal and focused:
- Only modified the validation schema and error handling
- No changes to routing, auth flow, or RLS policies
- No changes to other parts of the application
- Enhanced error messages for better debugging

The farm profile update now works correctly for all field types, and the Next/Image warning is resolved.
