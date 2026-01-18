import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkAdminClaimRateLimit,
  getClientIp,
} from "@/lib/server/rate-limit";

/**
 * POST /api/admin/claim
 *
 * Validates an admin access code and upgrades a user's role to admin.
 * This is a discreet endpoint for admin self-registration during signup.
 *
 * Security measures:
 * - Code is validated server-side only (never sent to client or stored in metadata)
 * - Rate limited per IP and per email
 * - Audit events are logged
 * - Never reveals whether code is correct on failure
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { email, code } = body;

    // Validate input
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, message: "Access code is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = getClientIp(request);

    // Check rate limits
    const rateLimitResult = checkAdminClaimRateLimit(clientIp, normalizedEmail);
    if (!rateLimitResult.allowed) {
      console.log(
        `[admin/claim] Rate limited: IP=${clientIp}, email=${normalizedEmail}`
      );
      return NextResponse.json(
        { success: false, message: rateLimitResult.message },
        { status: 429 }
      );
    }

    // Get the secret admin claim code from environment
    const adminClaimCode = process.env.ADMIN_CLAIM_CODE;

    if (!adminClaimCode) {
      console.error("[admin/claim] ADMIN_CLAIM_CODE not configured");
      // Return generic error to not reveal configuration status
      return NextResponse.json(
        { success: false, message: "Invalid access code." },
        { status: 401 }
      );
    }

    // Validate the code (exact match, case-sensitive)
    if (code !== adminClaimCode) {
      console.log(
        `[admin/claim] Invalid code attempt: IP=${clientIp}, email=${normalizedEmail}`
      );

      // Return generic error message - don't reveal that code was wrong
      return NextResponse.json(
        { success: false, message: "Invalid access code." },
        { status: 401 }
      );
    }

    // Code is valid! Now find and upgrade the user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[admin/claim] Missing Supabase credentials");
      return NextResponse.json(
        { success: false, message: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find user by email in auth.users
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("[admin/claim] Error listing users:", authError);
      return NextResponse.json(
        { success: false, message: "Failed to verify user" },
        { status: 500 }
      );
    }

    const user = authUsers.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!user) {
      // User doesn't exist yet - this is fine during signup flow
      // The user will be created, then this endpoint called again
      console.log(
        `[admin/claim] User not found yet: email=${normalizedEmail}. ` +
          "This is expected if called before user creation completes."
      );

      // Return success anyway - the signup flow will retry after user creation
      // This prevents timing attacks that could reveal user existence
      return NextResponse.json({
        success: true,
        message: "Access code validated",
        pending: true,
      });
    }

    // Check if user is already admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[admin/claim] Error fetching profile:", profileError);
      return NextResponse.json(
        { success: false, message: "Failed to verify user profile" },
        { status: 500 }
      );
    }

    if (profile?.role === "admin") {
      console.log(
        `[admin/claim] User already admin: email=${normalizedEmail}`
      );
      return NextResponse.json({
        success: true,
        message: "User is already an admin",
      });
    }

    // Upgrade user to admin
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id);

    if (updateError) {
      console.error("[admin/claim] Error updating profile:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to upgrade user" },
        { status: 500 }
      );
    }

    // Log the admin upgrade event for audit
    console.log(
      `[admin/claim] SUCCESS: User upgraded to admin: ` +
        `email=${normalizedEmail}, userId=${user.id}, IP=${clientIp}`
    );

    // Try to create an audit log entry (optional - don't fail if table doesn't exist)
    try {
      await supabaseAdmin.from("admin_audit").insert({
        user_id: user.id,
        action: "admin_claim_success",
        details: {
          email: normalizedEmail,
          ip: clientIp,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Audit table might not exist - that's fine
      console.log(
        "[admin/claim] Audit log insert skipped (table may not exist)"
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin access granted",
    });
  } catch (error) {
    console.error("[admin/claim] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
