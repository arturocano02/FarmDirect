import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Helper to normalize empty strings to null and validate URLs
const urlOrNull = z.preprocess(
  (val) => (val === "" || val === null ? null : val),
  z.string().url().nullable()
);

const UpdateFarmSchema = z.object({
  name: z.string().min(1).max(200),
  short_description: z.preprocess(
    (val) => (val === "" || val === null ? null : val),
    z.string().max(500).nullable()
  ).optional(),
  story: z.preprocess(
    (val) => (val === "" || val === null ? null : val),
    z.string().max(5000).nullable()
  ).optional(),
  address: z.preprocess(
    (val) => (val === "" || val === null ? null : val),
    z.string().max(500).nullable()
  ).optional(),
  postcode: z.preprocess(
    (val) => (val === "" || val === null ? null : val),
    z.string().max(20).nullable()
  ).optional(),
  postcode_rules: z.array(z.string()).nullable().optional(),
  delivery_days: z.array(z.string()).nullable().optional(),
  cutoff_time: z.preprocess(
    (val) => (val === "" || val === null ? null : val),
    z.string().nullable()
  ).optional(),
  min_order_value: z.number().int().min(0).nullable().optional(),
  delivery_fee: z.number().int().min(0).nullable().optional(),
  badges: z.array(z.string()).nullable().optional(),
  hero_image_url: urlOrNull.optional(),
  logo_url: urlOrNull.optional(),
  story_video_url: urlOrNull.optional(),
  contact_email: z.preprocess(
    (val) => (val === "" || val === null ? null : val),
    z.string().email().nullable()
  ).optional(),
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
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[api/farm/profile] JSON parse error:", err);
    }
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Whitelist allowed fields
  const allowedFields = [
    "name", "short_description", "story", "address", "postcode",
    "postcode_rules", "delivery_days", "cutoff_time",
    "min_order_value", "delivery_fee", "badges",
    "hero_image_url", "logo_url", "story_video_url",
    "contact_email", "receive_order_emails"
  ];

  // Build updateData only from allowed fields
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  // Validate with Zod
  const validation = UpdateFarmSchema.safeParse(updateData);
  if (!validation.success) {
    if (process.env.NODE_ENV === "development") {
      console.error("[api/farm/profile] Validation error:", validation.error.flatten());
    }
    return NextResponse.json(
      { ok: false, error: "Invalid farm data", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Get farm ID
  const farmId = (farm as { id: string }).id;

  // Update farm
  let updatePayload = validation.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: updatedFarm, error: updateError } = await (supabase as any)
    .from("farms")
    .update(updatePayload)
    .eq("id", farmId)
    .select()
    .single();

  // Defensive: If PGRST204 error for receive_order_emails, retry without it
  if (updateError?.code === "PGRST204" && 
      updateError?.message?.includes("receive_order_emails") &&
      "receive_order_emails" in updatePayload) {
    // Remove receive_order_emails from payload and retry
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { receive_order_emails: _receive_order_emails, ...payloadWithoutField } = updatePayload;
    updatePayload = payloadWithoutField;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retryResult = await (supabase as any)
      .from("farms")
      .update(updatePayload)
      .eq("id", farmId)
      .select()
      .single();
    
    updatedFarm = retryResult.data;
    updateError = retryResult.error;
    
    if (process.env.NODE_ENV === "development") {
      console.warn("[api/farm/profile] Column receive_order_emails not found, omitted from update");
    }
  }

  if (updateError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[api/farm/profile] Update error:", {
        error: updateError,
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        farmId,
        userId: user.id,
      });
    }

    // Return appropriate status based on error
    const status = updateError.code === "PGRST301" || updateError.code === "42501" 
      ? 403 
      : updateError.code === "23505" 
        ? 409 
        : 400;

    return NextResponse.json(
      { 
        ok: false, 
        error: updateError.message || "Failed to update profile",
        code: updateError.code 
      },
      { status }
    );
  }

  return NextResponse.json({ ok: true, farm: updatedFarm });
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
