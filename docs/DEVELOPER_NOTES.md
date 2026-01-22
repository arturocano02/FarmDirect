# Developer Notes

## Runtime Warnings

### Extra Attributes Warning (data-new-gr-c-s-check-loaded, data-gr-ext-installed)

**Warning:**
```
Warning: Extra attributes from the server: data-new-gr-c-s-check-loaded,data-gr-ext-installed
```

**Cause:** This warning is caused by browser extensions (specifically Grammarly) injecting attributes into the DOM. This is not a bug in the application code.

**Action:** This warning can be safely ignored in development. It does not affect functionality or production builds.

**Note:** If you see this warning, it means you have the Grammarly browser extension installed. The extension adds these attributes for its own functionality, and React detects them as a hydration mismatch. This is a known issue with browser extensions and React, not with our codebase.

## Image Configuration

### Next.js Image Optimization

The application uses Next.js Image optimization for all images. Configuration is in `next.config.mjs`:

- **Supabase Storage:** `*.supabase.co` with path `/storage/v1/object/public/**`
- **Unsplash:** `images.unsplash.com`

If you encounter 404 errors for `/_next/image`, check:
1. Image URLs are valid absolute URLs (not undefined or empty)
2. Supabase project URL matches the pattern in `next.config.mjs`
3. Images are uploaded to public buckets with correct policies

### Image Fallbacks

All Image components have error handlers that display placeholder content if the image fails to load. This prevents broken image displays.

## Upload System

### Service Role Client

The upload route (`/api/upload`) uses the service role client to bypass RLS policies. This is necessary because:
- RLS policies check farm ownership via `auth.uid()`
- Storage policies require authenticated users
- Service role bypasses RLS for server-side operations

**Security:** The service role key is never exposed to the client. All uploads are validated server-side for:
- File type (images: JPG, PNG, WebP, GIF; videos: MP4, WebM, QuickTime)
- File size (images: 5MB max; videos: 50MB max)
- User permissions (farm owner or admin)
- Bucket and path validation

## Environment Variables

Required variables in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin
ADMIN_EMAILS=admin@example.com,other@example.com
ADMIN_CLAIM_CODE=FARMADMIN26
```

**Verification:**
- Run `pnpm db:print-migrations` to verify Supabase connection
- Check `/api/health` endpoint for configuration status
