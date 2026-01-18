import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/server/admin-emails";
import { getHomePathForRole } from "@/lib/auth/redirect-by-role";

/**
 * POST /api/auth/sync-role
 * Syncs user role based on admin email allowlist
 * Called after successful login/signup
 * 
 * Returns: { role, redirectPath }
 */
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { error: "User has no email" },
        { status: 400 }
      );
    }

    // Get current profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[sync-role] Error fetching profile:", profileError);
    }

    const currentRole = profile?.role || user.user_metadata?.role || "customer";
    let newRole = currentRole;

    // Check if user should be admin based on email allowlist
    if (isAdminEmail(email)) {
      // User is in admin allowlist - promote to admin if not already
      if (currentRole !== "admin") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", user.id);

        if (updateError) {
          console.error("[sync-role] Error promoting to admin:", updateError);
        } else {
          console.log(`[sync-role] Promoted ${email} to admin`);
          newRole = "admin";
        }
      } else {
        newRole = "admin";
      }
    }
    // NOTE: We do NOT downgrade admins who are not in the list
    // This prevents accidental lockouts if env var changes

    const redirectPath = getHomePathForRole(newRole);

    return NextResponse.json({
      role: newRole,
      redirectPath,
    });
  } catch (error) {
    console.error("[sync-role] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/sync-role
 * Same as POST for convenience
 */
export async function GET() {
  return POST();
}
