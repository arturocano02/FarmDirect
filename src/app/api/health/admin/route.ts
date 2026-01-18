/**
 * Admin Health Check Endpoint
 * GET /api/health/admin
 * Returns: { ok: true } if user is admin, otherwise 403
 * Used to verify admin access works end-to-end
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get role from profiles table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role || user.user_metadata?.role || "customer";

    if (role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Forbidden: admin role required" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      email: user.email,
      role: "admin",
      message: "Admin access verified",
    });
  } catch (error) {
    console.error("[api/health/admin] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
