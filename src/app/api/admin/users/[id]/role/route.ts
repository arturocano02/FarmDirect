import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateRoleSchema = z.object({
  role: z.enum(["customer", "farm", "admin"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/users/[id]/role
 * Update user role (admin only)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id: userId } = await context.params;
  const supabase = await createClient();

  // Check admin auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!profile || (profile as any).role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Prevent self-demotion (safety check)
  if (user.id === userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetProfile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((targetProfile as any)?.role === "admin") {
      return NextResponse.json(
        { error: "Cannot change your own admin role" },
        { status: 403 }
      );
    }
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = UpdateRoleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { role } = validation.data;

  // Update user role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (updateError) {
    console.error("[admin/users/[id]/role] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  console.log("[admin/users/[id]/role] Updated:", {
    userId,
    role,
    by: user.id,
  });

  return NextResponse.json({ success: true });
}
