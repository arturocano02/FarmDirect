import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const PayoutSettingsSchema = z.object({
  farm_id: z.string().uuid(),
  payout_method: z.enum(["bank_transfer"]),
  account_holder_name: z.string().min(1).max(200),
  sort_code: z.string().length(6).regex(/^\d{6}$/),
  account_number_last4: z.string().length(4).regex(/^\d{4}$/),
  bank_name: z.string().max(100).nullable().optional(),
});

/**
 * POST /api/farm/payouts
 * Save payout settings (only stores last 4 digits of account number)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = PayoutSettingsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid payout data", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { farm_id, payout_method, account_holder_name, sort_code, account_number_last4, bank_name } = validation.data;

  // Verify user owns the farm
  const { data: farm, error: farmError } = await supabase
    .from("farms")
    .select("id")
    .eq("id", farm_id)
    .eq("owner_user_id", user.id)
    .single();

  if (farmError || !farm) {
    return NextResponse.json({ error: "Farm not found or not owned by you" }, { status: 403 });
  }

  // Upsert payout settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any)
    .from("farm_payouts")
    .upsert({
      farm_id,
      payout_method,
      account_holder_name,
      sort_code,
      account_number_last4,
      bank_name: bank_name || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "farm_id",
    });

  if (upsertError) {
    console.error("[api/farm/payouts] Upsert error:", upsertError);
    return NextResponse.json({ error: "Failed to save payout settings" }, { status: 500 });
  }

  console.log("[api/farm/payouts] Saved payout settings for farm:", farm_id);

  return NextResponse.json({ success: true });
}

/**
 * GET /api/farm/payouts
 * Get current payout settings
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
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (farmError || !farm) {
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  }

  // Get payout settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payout, error: payoutError } = await (supabase as any)
    .from("farm_payouts")
    .select("*")
    .eq("farm_id", (farm as { id: string }).id)
    .single();

  if (payoutError && payoutError.code !== "PGRST116") {
    console.error("[api/farm/payouts] Error fetching:", payoutError);
    return NextResponse.json({ error: "Failed to fetch payout settings" }, { status: 500 });
  }

  return NextResponse.json({ success: true, payout: payout || null });
}
