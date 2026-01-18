/**
 * Farm Data Access Layer
 * Server-side functions for fetching farm data
 * 
 * All functions use the anonymous Supabase client and work WITHOUT login.
 * RLS policies allow public read of approved farms.
 */

import { createClient } from "@supabase/supabase-js";
import type { Farm } from "@/types/database";

export interface FarmWithProductCount extends Farm {
  product_count: number;
}

export interface FarmFilters {
  badges?: string[];
  search?: string;
}

/**
 * Creates an anonymous Supabase client for public data access
 * Does NOT use cookies/sessions - pure anonymous access
 * 
 * IMPORTANT: This uses the ANON key intentionally for public reads.
 * RLS policies must allow anonymous SELECT on approved farms.
 */
function createAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error(
      "Missing Supabase environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
    console.error("[farms] createAnonClient error:", error.message);
    throw error;
  }

  // Debug logging (safe - no secrets logged)
  if (process.env.NODE_ENV === "development") {
    console.log("[farms] createAnonClient:", {
      url: supabaseUrl.substring(0, 30) + "...",
      keyType: "anon (public)",
      persistSession: false,
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get all approved farms with optional filtering
 * Works WITHOUT authentication - uses RLS policy "Anyone can read approved farms"
 */
export async function getApprovedFarms(
  filters?: FarmFilters
): Promise<FarmWithProductCount[]> {
  const supabase = createAnonClient();

  // Build query
  let query = supabase
    .from("farms")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // Apply badge filter only if badges are provided and non-empty
  if (filters?.badges && filters.badges.length > 0) {
    // Filter farms that have ANY of the selected badges
    query = query.overlaps("badges", filters.badges);
  }

  // Apply search filter only if search is provided and non-empty
  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase();
    // Search in name, short_description, or postcode
    query = query.or(
      `name.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%,postcode.ilike.${searchTerm}%`
    );
  }

  const { data, error } = await query;

  // Debug logging in development - DO NOT swallow errors
  if (process.env.NODE_ENV === "development") {
    console.log("[farms] getApprovedFarms result:", {
      count: data?.length ?? 0,
      error: error ? `${error.message} (code: ${error.code})` : null,
      filtersApplied: {
        badges: filters?.badges?.length ?? 0,
        search: filters?.search ? true : false,
      },
    });
  }

  if (error) {
    console.error("[farms] ERROR fetching farms:", {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details,
    });
    // DO NOT silently return empty array - this might hide real issues
    throw new Error(`Failed to fetch farms: ${error.message}`);
  }

  if (!data || data.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[farms] No approved farms found. Run: pnpm db:seed");
    }
    return [];
  }

  // Type assertion
  const farms = data as unknown as Farm[];

  // Get product counts for each farm (batch would be better but this works)
  const farmsWithCounts: FarmWithProductCount[] = [];
  
  for (const farm of farms) {
    const { count, error: countError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("farm_id", farm.id)
      .eq("is_active", true);
    
    if (countError && process.env.NODE_ENV === "development") {
      console.log(`[farms] Error getting product count for ${farm.slug}:`, countError.message);
    }
    
    farmsWithCounts.push({
      ...farm,
      product_count: count || 0,
    });
  }

  return farmsWithCounts;
}

/**
 * Get a single farm by slug
 * Works WITHOUT authentication
 */
export async function getFarmBySlug(slug: string): Promise<Farm | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (error) {
    // PGRST116 = not found, which is expected for invalid slugs
    if (error.code !== "PGRST116") {
      console.error("[farms] ERROR fetching farm by slug:", {
        slug,
        message: error.message,
        code: error.code,
      });
    }
    return null;
  }

  return data as unknown as Farm;
}

/**
 * Get all unique badges across approved farms
 * Works WITHOUT authentication
 */
export async function getAllBadges(): Promise<string[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("farms")
    .select("badges")
    .eq("status", "approved");

  if (error) {
    console.error("[farms] ERROR fetching badges:", error.message);
    return [];
  }

  if (!data) {
    return [];
  }

  // Flatten and dedupe badges
  const allBadges = new Set<string>();
  const farmBadges = data as unknown as Array<{ badges: string[] | null }>;
  
  farmBadges.forEach((farm) => {
    farm.badges?.forEach((badge) => allBadges.add(badge));
  });

  return Array.from(allBadges).sort();
}

/**
 * Format badge for display
 */
export function formatBadge(badge: string): string {
  return badge
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get badge color class
 */
export function getBadgeColorClass(badge: string): string {
  const colors: Record<string, string> = {
    "grass-fed": "bg-emerald-100 text-emerald-800",
    "heritage-breed": "bg-amber-100 text-amber-800",
    "pasture-raised": "bg-lime-100 text-lime-800",
    "award-winning": "bg-yellow-100 text-yellow-800",
    "local-sourced": "bg-blue-100 text-blue-800",
    "dry-aged": "bg-purple-100 text-purple-800",
    "scottish": "bg-indigo-100 text-indigo-800",
    "native-breeds": "bg-orange-100 text-orange-800",
    "hill-reared": "bg-stone-100 text-stone-800",
    "free-range": "bg-green-100 text-green-800",
    "woodland-reared": "bg-teal-100 text-teal-800",
    "small-batch": "bg-rose-100 text-rose-800",
    "organic": "bg-emerald-100 text-emerald-800",
    "regenerative": "bg-cyan-100 text-cyan-800",
    "carbon-negative": "bg-sky-100 text-sky-800",
    "moorland-grazed": "bg-violet-100 text-violet-800",
    "salt-marsh": "bg-blue-100 text-blue-800",
    "traditional": "bg-amber-100 text-amber-800",
    "family-run": "bg-pink-100 text-pink-800",
    "sustainable": "bg-teal-100 text-teal-800",
    "rare-breed": "bg-orange-100 text-orange-800",
    "slow-grown": "bg-amber-100 text-amber-800",
    "artisan": "bg-purple-100 text-purple-800",
    "ethical": "bg-green-100 text-green-800",
    "traceable": "bg-blue-100 text-blue-800",
    "welfare-certified": "bg-emerald-100 text-emerald-800",
    "wild": "bg-green-100 text-green-800",
    "welsh": "bg-red-100 text-red-800",
    "mountain-raised": "bg-stone-100 text-stone-800",
  };

  return colors[badge] || "bg-gray-100 text-gray-800";
}
