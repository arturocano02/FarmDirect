import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

/**
 * Check if we're in a build phase where env vars may not be available
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Creates a Supabase client for server-side use (RSC, API routes)
 * Uses the anon key - respects RLS policies
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build phase, return a dummy client that won't be used
  if (isBuildPhase() && (!supabaseUrl || !supabaseAnonKey)) {
    // Return a minimal mock for build-time static generation
    return createServerClient<Database>(
      "http://placeholder.supabase.co",
      "placeholder-key",
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "\n\n❌ Missing Supabase environment variables!\n\n" +
      "Please ensure these are set in .env.local:\n" +
      "  - NEXT_PUBLIC_SUPABASE_URL\n" +
      "  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n" +
      "Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n"
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with service role privileges
 * Bypasses RLS - use only for admin operations and seeding
 */
export async function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "\n\n❌ Missing Supabase service role key!\n\n" +
      "Please ensure these are set in .env.local:\n" +
      "  - NEXT_PUBLIC_SUPABASE_URL\n" +
      "  - SUPABASE_SERVICE_ROLE_KEY\n\n" +
      "Get the service_role key from:\n" +
      "https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n\n" +
      "⚠️  The service role key bypasses RLS. Keep it secret!\n"
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service client doesn't need cookies
        },
      },
    }
  );
}
