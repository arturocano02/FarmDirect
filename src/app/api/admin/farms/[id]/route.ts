import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateFarmSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  short_description: z.string().max(500).nullable().optional(),
  story: z.string().max(5000).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  postcode: z.string().max(20).nullable().optional(),
  min_order_value: z.number().int().min(0).nullable().optional(),
  delivery_fee: z.number().int().min(0).nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/farms/[id]
 * Update farm details (admin only)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id: farmId } = await context.params;
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

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = UpdateFarmSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Update farm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("farms")
    .update(validation.data)
    .eq("id", farmId);

  if (updateError) {
    console.error("[admin/farms/[id]] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update farm" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
