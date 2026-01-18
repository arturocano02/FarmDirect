import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { FarmStatus } from "@/types/database";

const FARM_STATUSES: FarmStatus[] = ["pending", "approved", "suspended"];

const UpdateStatusSchema = z.object({
  status: z.enum(FARM_STATUSES as [FarmStatus, ...FarmStatus[]]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/farms/[id]/status
 * Update farm status (admin only)
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

  const validation = UpdateStatusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { status } = validation.data;

  // Update farm status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("farms")
    .update({ status })
    .eq("id", farmId);

  if (updateError) {
    console.error("[admin/farms/status] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  console.log("[admin/farms/status] Updated:", {
    farmId,
    status,
    by: user.id,
  });

  return NextResponse.json({ success: true });
}
