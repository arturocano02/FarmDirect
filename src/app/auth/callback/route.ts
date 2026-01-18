import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/server/admin-emails";
import { getHomePathForRole } from "@/lib/auth/redirect-by-role";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email || "";
      
      // Get user role from profile or metadata
      let userRole = data.user.user_metadata?.role;
      
      if (!userRole) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        userRole = profile?.role || "customer";
      }

      // Check if user should be admin based on email allowlist
      if (isAdminEmail(email) && userRole !== "admin") {
        // Promote to admin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", data.user.id);

        if (!updateError) {
          console.log(`[auth/callback] Promoted ${email} to admin`);
          userRole = "admin";
        }
      }

      // Determine redirect based on role
      let redirectPath: string;
      
      if (next) {
        // If explicit next path provided, use it
        redirectPath = next;
      } else if (userRole === "farm") {
        // Check if farm user has a farm set up
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: farm } = await (supabase as any)
          .from("farms")
          .select("id")
          .eq("owner_user_id", data.user.id)
          .single();

        if (farm) {
          redirectPath = "/farm-portal";
        } else {
          redirectPath = "/farm-portal/onboarding";
        }
      } else {
        redirectPath = getHomePathForRole(userRole);
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Auth error - redirect to login with error message
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("message", "There was an error signing you in. Please try again.");
  return NextResponse.redirect(loginUrl.toString());
}
