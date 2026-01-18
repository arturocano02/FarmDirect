/**
 * Health Check Endpoint - User Role
 * Returns current user's email and role if authenticated, otherwise { role: null }
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
        authenticated: false,
        email: null,
        role: null,
      });
    }

    // Get role from profiles table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[api/health/roles] Profile fetch error:", profileError);
    }

    const role = (profile as { role?: string } | null)?.role || user.user_metadata?.role || "customer";

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      role,
      userId: user.id.substring(0, 8) + "...",
    });
  } catch (error) {
    console.error("[api/health/roles] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
