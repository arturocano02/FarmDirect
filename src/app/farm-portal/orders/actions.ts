"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

/**
 * Server action to update order status from farm portal
 * This ensures proper audit trail with actor_role='farm' and actor_user_id
 */
export async function updateFarmOrderStatusAction(
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

  // Get user's farm
  const { data: farmData, error: farmError } = await supabase
    .from("farms")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (farmError || !farmData) {
    return { success: false, error: "Farm not found" };
  }

  const farm = farmData as { id: string };

  // Verify order belongs to this farm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderData, error: orderError } = await (supabase as any)
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("farm_id", farm.id)
    .single();

  if (orderError || !orderData) {
    console.error("[updateFarmOrderStatusAction] Order not found:", orderError);
    return { success: false, error: "Order not found or doesn't belong to your farm" };
  }

  const currentStatus = orderData.status;

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
    console.error("[updateFarmOrderStatusAction] Update error:", updateError);
    return { success: false, error: "Failed to update status" };
  }

  // Create order event for audit trail with proper actor fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: eventError } = await (supabase as any)
    .from("order_events")
    .insert({
      order_id: orderId,
      actor_user_id: user.id,
      actor_role: "farm",
      status_from: currentStatus,
      status_to: newStatus,
      note: note || `Status changed to ${newStatus.replace(/_/g, " ")}`,
    });

  if (eventError) {
    console.error("[updateFarmOrderStatusAction] Event error:", eventError);
    // Non-critical, continue
  }

  console.log("[updateFarmOrderStatusAction] Updated:", {
    orderId,
    from: currentStatus,
    to: newStatus,
    by: user.id,
  });

  // Revalidate the order pages
  revalidatePath("/farm-portal/orders");
  revalidatePath(`/farm-portal/orders/${orderId}`);

  return { success: true };
}
