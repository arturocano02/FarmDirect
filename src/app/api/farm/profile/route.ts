import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateFarmSchema = z.object({
  name: z.string().min(1).max(200),
  short_description: z.string().max(500).nullable().optional(),
  story: z.string().max(5000).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  postcode: z.string().max(20).nullable().optional(),
  postcode_rules: z.array(z.string()).nullable().optional(),
  delivery_days: z.array(z.string()).nullable().optional(),
  cutoff_time: z.string().nullable().optional(),
  min_order_value: z.number().int().min(0).nullable().optional(),
  delivery_fee: z.number().int().min(0).nullable().optional(),
  badges: z.array(z.string()).nullable().optional(),
  hero_image_url: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  receive_order_emails: z.boolean().optional(),
});

/**
 * PUT /api/farm/profile
 * Update farm profile
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's farm
  const { data: farm, error: farmError } = await supabase
    .from("farms")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (farmError || !farm) {
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });
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
      { error: "Invalid farm data", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Update farm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("farms")
    .update(validation.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("id", (farm as any).id);

  if (updateError) {
    console.error("[api/farm/profile] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/farm/profile
 * Get current user's farm profile
 */
export async function GET() {
  const supabase = await createClient();

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's farm
  const { data: farm, error: farmError } = await supabase
    .from("farms")
    .select("*")
    .eq("owner_user_id", user.id)
    .single();

  if (farmError || !farm) {
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, farm });
}
