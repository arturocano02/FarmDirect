import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().int().positive(),
  unit_label: z.string().min(1).max(50),
  weight_label: z.string().max(50).nullable().optional(),
  stock_qty: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
  image_url: z.string().url().nullable().optional(),
  farm_id: z.string().uuid(),
});

/**
 * POST /api/farm/products
 * Create a new product
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

  const validation = ProductSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid product data", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const productData = validation.data;

  // Verify user owns the farm
  const { data: farm } = await supabase
    .from("farms")
    .select("id")
    .eq("id", productData.farm_id)
    .eq("owner_user_id", user.id)
    .single();

  if (!farm) {
    return NextResponse.json({ error: "Farm not found or not owned by you" }, { status: 403 });
  }

  // Create product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product, error: insertError } = await (supabase as any)
    .from("products")
    .insert({
      name: productData.name,
      description: productData.description || null,
      price: productData.price,
      unit_label: productData.unit_label,
      weight_label: productData.weight_label || null,
      stock_qty: productData.stock_qty ?? null,
      is_active: productData.is_active,
      image_url: productData.image_url || null,
      farm_id: productData.farm_id,
      sort_order: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[api/farm/products] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }

  return NextResponse.json({ success: true, product });
}
