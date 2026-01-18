import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().int().positive().optional(),
  unit_label: z.string().min(1).max(50).optional(),
  weight_label: z.string().max(50).nullable().optional(),
  stock_qty: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().url().nullable().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/farm/products/[id]
 * Update a product
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id: productId } = await context.params;
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

  const validation = UpdateProductSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid product data", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Verify product belongs to user's farm
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      farms!inner(owner_user_id)
    `)
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const farmOwner = (product as { farms: { owner_user_id: string } }).farms.owner_user_id;
  if (farmOwner !== user.id) {
    return NextResponse.json({ error: "Not authorized to edit this product" }, { status: 403 });
  }

  // Update product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("products")
    .update(validation.data)
    .eq("id", productId);

  if (updateError) {
    console.error("[api/farm/products/id] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/farm/products/[id]
 * Delete a product
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: productId } = await context.params;
  const supabase = await createClient();

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify product belongs to user's farm
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      farms!inner(owner_user_id)
    `)
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const farmOwner = (product as { farms: { owner_user_id: string } }).farms.owner_user_id;
  if (farmOwner !== user.id) {
    return NextResponse.json({ error: "Not authorized to delete this product" }, { status: 403 });
  }

  // Delete product
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (deleteError) {
    console.error("[api/farm/products/id] Delete error:", deleteError);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
