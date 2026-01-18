import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Health check endpoint that verifies Supabase connection and data
 * Works WITHOUT authentication - uses anon key directly
 * 
 * GET /api/health
 * Returns: { supabaseUrl, approvedFarmsCount, activeProductsCount, ordersCount, ok, error }
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check env vars
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      ok: false,
      supabaseUrl: supabaseUrl || "NOT SET",
      approvedFarmsCount: 0,
      activeProductsCount: 0,
      ordersCount: 0,
      error: "Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    }, { status: 500 });
  }

  try {
    // Create a fresh client without any session/cookie handling
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query approved farms count
    const { count: farmsCount, error: farmsError } = await supabase
      .from("farms")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    if (farmsError) {
      return NextResponse.json({
        ok: false,
        supabaseUrl,
        approvedFarmsCount: 0,
        activeProductsCount: 0,
        ordersCount: 0,
        error: `Farms query error: ${farmsError.message} (code: ${farmsError.code})`,
        hint: farmsError.hint || null,
      }, { status: 500 });
    }

    // Query active products count
    const { count: productsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Query orders count (may fail due to RLS - that's ok)
    const { count: ordersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    // Query addresses table to verify Phase D migration
    const { error: addressesError } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .limit(1);

    // Get sample farm names for debugging
    const { data: sampleFarms } = await supabase
      .from("farms")
      .select("name, slug")
      .eq("status", "approved")
      .limit(3);

    // Check email_outbox table (Phase D)
    const { error: emailOutboxError } = await supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .limit(1);

    return NextResponse.json({
      ok: true,
      supabaseUrl,
      approvedFarmsCount: farmsCount || 0,
      activeProductsCount: productsCount || 0,
      ordersCount: ordersCount || 0,
      sampleFarms: sampleFarms || [],
      tables: {
        addresses: !addressesError,
        email_outbox: !emailOutboxError,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      ok: false,
      supabaseUrl,
      approvedFarmsCount: 0,
      activeProductsCount: 0,
      ordersCount: 0,
      error: `Unexpected error: ${errorMessage}`,
    }, { status: 500 });
  }
}
