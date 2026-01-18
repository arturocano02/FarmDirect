/**
 * Public Farms Health Check Endpoint
 * Tests that farms can be fetched using the anon key (no auth required)
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check env vars
    diagnostics.envVars = {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      urlPrefix: supabaseUrl?.substring(0, 30) + "...",
    };

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        ok: false,
        farmCount: 0,
        error: "Missing Supabase environment variables",
        diagnostics,
        durationMs: Date.now() - startTime,
      }, { status: 500 });
    }

    // Create anon client (same as farms.ts)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check auth state (should be anonymous)
    const { data: { user } } = await supabase.auth.getUser();
    diagnostics.authState = {
      isAuthenticated: !!user,
      userId: user?.id ? user.id.substring(0, 8) + "..." : null,
    };

    // Query farms exactly as getApprovedFarms does
    const { data: farms, error: farmsError, count } = await supabase
      .from("farms")
      .select("id, name, slug, status", { count: "exact" })
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    if (farmsError) {
      diagnostics.query = {
        table: "farms",
        filter: "status=approved",
        error: {
          message: farmsError.message,
          code: farmsError.code,
          hint: farmsError.hint,
          details: farmsError.details,
        },
      };

      console.error("[api/health/public-farms] Query error:", farmsError);

      return NextResponse.json({
        ok: false,
        farmCount: 0,
        error: `Database query failed: ${farmsError.message}`,
        diagnostics,
        durationMs: Date.now() - startTime,
      }, { status: 500 });
    }

    diagnostics.query = {
      table: "farms",
      filter: "status=approved",
      success: true,
      returnedRows: farms?.length ?? 0,
      totalCount: count,
    };

    // Also check products table access
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name", { count: "exact" })
      .eq("is_active", true)
      .limit(5);

    diagnostics.productsQuery = {
      success: !productsError,
      returnedRows: products?.length ?? 0,
      error: productsError ? {
        message: productsError.message,
        code: productsError.code,
      } : null,
    };

    const farmCount = count ?? farms?.length ?? 0;
    const isOk = farmCount > 0 || !farmsError;

    console.log("[api/health/public-farms] Check complete:", {
      ok: isOk,
      farmCount,
      productsCount: products?.length ?? 0,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: isOk,
      farmCount,
      farms: farms?.map(f => ({ name: f.name, slug: f.slug })) ?? [],
      error: null,
      diagnostics,
      durationMs: Date.now() - startTime,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/health/public-farms] Unhandled error:", error);

    return NextResponse.json({
      ok: false,
      farmCount: 0,
      error: message,
      diagnostics,
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}
