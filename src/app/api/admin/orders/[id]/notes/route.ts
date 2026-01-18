import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AddNoteSchema = z.object({
  note: z.string().min(1).max(2000),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/notes
 * Add internal note to order (admin only)
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
    .select("role, name")
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

  const validation = AddNoteSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { note } = validation.data;

  // Verify order exists
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Insert note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newNote, error: insertError } = await (supabase as any)
    .from("internal_notes")
    .insert({
      order_id: orderId,
      author_user_id: user.id,
      note,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[admin/orders/notes] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    note: {
      ...(newNote || {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profiles: { name: (profile as any).name },
    },
  });
}
