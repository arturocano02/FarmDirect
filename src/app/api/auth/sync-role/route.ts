import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { 
  isEmailAdminAllowlisted, 
  getEffectiveRole, 
  getHomePathForRole,
  logRoleDetection 
} from "@/lib/auth/roles";

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

    const profileRole = profile?.role || null;
    const metadataRole = user.user_metadata?.role || null;
    const isAllowlisted = isEmailAdminAllowlisted(email);
    
    // Get effective role using centralized logic
    let newRole = getEffectiveRole({
      sessionUser: user,
      profileRole,
    });

    // Log role detection
    logRoleDetection("sync-role", {
      email,
      profileRole,
      metadataRole,
      effectiveRole: newRole,
      isAllowlisted,
      decision: "Determining redirect path",
    });

    // If user is in admin allowlist but profile isn't admin, update it
    if (isAllowlisted && profileRole !== "admin") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", user.id);

      if (updateError) {
        console.error("[sync-role] Error promoting to admin:", updateError);
      } else {
        console.log(`[sync-role] Promoted ${email} to admin via allowlist`);
        newRole = "admin";
      }
    }

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
