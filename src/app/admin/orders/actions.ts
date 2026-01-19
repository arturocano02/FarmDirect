"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveRole } from "@/lib/auth/roles";
import type { OrderStatus } from "@/types/database";

const VALID_STATUSES: OrderStatus[] = [
  "processing",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "exception",
];

interface UpdateOrderStatusResult {
  success: boolean;
  error?: string;
}

export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
  note?: string
): Promise<UpdateOrderStatusResult> {
  // Validate status
  if (!VALID_STATUSES.includes(newStatus as OrderStatus)) {
    return { success: false, error: "Invalid status" };
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify admin role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const effectiveRole = getEffectiveRole({
    sessionUser: user,
    profileRole: profile?.role,
  });

  if (effectiveRole !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  // Get current order status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (supabase as any)
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("[updateOrderStatusAction] Order not found:", orderError);
    return { success: false, error: "Order not found" };
  }

  const currentStatus = order.status;

  // Don't update if status hasn't changed and no note
  if (currentStatus === newStatus && !note) {
    return { success: true };
  }

  // Update order status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (updateError) {
    console.error("[updateOrderStatusAction] Update error:", updateError);
    return { success: false, error: "Failed to update status" };
  }

  // Create order event for audit trail
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: eventError } = await (supabase as any)
    .from("order_events")
    .insert({
      order_id: orderId,
      actor_user_id: user.id,
      actor_role: "admin",
      status_from: currentStatus,
      status_to: newStatus,
      note: note || `Status changed to ${newStatus.replace("_", " ")}`,
    });

  if (eventError) {
    console.error("[updateOrderStatusAction] Event error:", eventError);
    // Non-critical, continue
  }

  console.log("[updateOrderStatusAction] Updated:", {
    orderId,
    from: currentStatus,
    to: newStatus,
    by: user.id,
  });

  // Revalidate the orders pages
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}
