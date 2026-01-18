import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { OrderStatus } from "@/types/database";

const ORDER_STATUSES: OrderStatus[] = [
  "processing",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "exception",
];

const UpdateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
  note: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/status
 * Update order status (admin only)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: orderId } = await context.params;
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

  const { status, note } = validation.data;

  // Get current order status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (supabase as any)
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStatus = (order as any).status;

  // Update order status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (updateError) {
    console.error("[admin/orders/status] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  // Create order event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: eventError } = await (supabase as any)
    .from("order_events")
    .insert({
      order_id: orderId,
      actor_user_id: user.id,
      actor_role: "admin",
      status_from: currentStatus,
      status_to: status,
      note: note || null,
    });

  if (eventError) {
    console.error("[admin/orders/status] Event error:", eventError);
    // Non-critical, continue
  }

  console.log("[admin/orders/status] Updated:", {
    orderId,
    from: currentStatus,
    to: status,
    by: user.id,
  });

  return NextResponse.json({ success: true });
}
