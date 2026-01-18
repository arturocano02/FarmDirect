import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const validStatuses = [
  "processing",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "exception",
] as const;

const UpdateStatusSchema = z.object({
  status: z.enum(validStatuses),
  note: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/farm/orders/[id]/status
 * Update order status (farm owner only)
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = UpdateStatusSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid status", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { status: newStatus, note } = validation.data;

    // 3. Get the user's farm
    const { data: farmData, error: farmError } = await supabase
      .from("farms")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (farmError || !farmData) {
      return NextResponse.json(
        { error: "You don't have a farm associated with your account" },
        { status: 403 }
      );
    }

    const farm = farmData as { id: string };

    // 4. Verify the order belongs to this farm
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, status, order_number")
      .eq("id", orderId)
      .eq("farm_id", farm.id)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: "Order not found or doesn't belong to your farm" },
        { status: 404 }
      );
    }

    const order = orderData as { id: string; status: string; order_number: string };
    const previousStatus = order.status;

    // 5. Don't update if status is the same
    if (previousStatus === newStatus) {
      return NextResponse.json(
        { error: "Order is already in this status" },
        { status: 400 }
      );
    }

    // 6. Update order status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("[farm-orders] Error updating status:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // 7. Create order event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: eventError } = await (supabase as any)
      .from("order_events")
      .insert({
        order_id: orderId,
        actor_user_id: user.id,
        actor_role: "farm",
        status_from: previousStatus,
        status_to: newStatus,
        note: note || `Status updated to ${newStatus.replace(/_/g, " ")}`,
      });

    if (eventError) {
      console.error("[farm-orders] Error creating event:", eventError);
      // Non-critical, continue
    }

    // 8. Log for notifications (placeholder)
    console.log("[farm-orders] STATUS UPDATED:", {
      order_number: order.order_number,
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      updated_by: user.id,
    });

    // TODO: Send status update email to customer
    // await sendStatusUpdateEmail(order, newStatus);

    // 9. Return success
    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        status: newStatus,
        previous_status: previousStatus,
      },
    });

  } catch (error) {
    console.error("[farm-orders] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
