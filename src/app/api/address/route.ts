import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().min(1).max(50).default("Home"),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().min(5).max(10),
  country: z.string().default("United Kingdom"),
  is_default: z.boolean().default(false),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

/**
 * GET /api/address
 * Get all addresses for the current user
 */
export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { data: addresses, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("[api/address] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: addresses,
  });
}

/**
 * POST /api/address
 * Create a new address for the current user
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  
  const validation = addressSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: address, error } = await (supabase as any)
    .from("addresses")
    .insert({
      user_id: user.id,
      ...validation.data,
    })
    .select()
    .single();
  
  if (error) {
    console.error("[api/address] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: address,
  });
}

/**
 * PUT /api/address
 * Update an existing address
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  
  const { id, ...updateData } = body;
  
  if (!id) {
    return NextResponse.json(
      { error: "Address ID is required" },
      { status: 400 }
    );
  }
  
  const validation = addressSchema.partial().safeParse(updateData);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }
  
  // RLS ensures user can only update their own addresses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: address, error } = await (supabase as any)
    .from("addresses")
    .update(validation.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  
  if (error) {
    console.error("[api/address] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
  
  if (!address) {
    return NextResponse.json(
      { error: "Address not found" },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: address,
  });
}

/**
 * DELETE /api/address?id=xxx
 * Delete an address
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json(
      { error: "Address ID is required" },
      { status: 400 }
    );
  }
  
  // RLS ensures user can only delete their own addresses
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  
  if (error) {
    console.error("[api/address] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    success: true,
  });
}
