/**
 * Health Check Endpoint - Current User
 * GET /api/health/me
 * Returns: { loggedIn: boolean, email: string | null, role: string | null }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        loggedIn: false,
        email: null,
        role: null,
      });
    }

    // Get role from profiles table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role || user.user_metadata?.role || "customer";

    return NextResponse.json({
      loggedIn: true,
      email: user.email || null,
      role,
    });
  } catch (error) {
    console.error("[api/health/me] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
