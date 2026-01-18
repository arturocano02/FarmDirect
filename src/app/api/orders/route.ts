import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Product, Farm, Address, DeliveryAddressJson } from "@/types/database";
import { formatAddressString } from "@/lib/services/address-lookup";
import {
  sendOrderConfirmationEmail,
  sendNewOrderFarmEmail,
  sendNewOrderAdminEmail,
} from "@/lib/services/email";

// Request validation schema
const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});

// Structured address schema (for manual entry)
const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  county: z.string().optional().nullable(),
  postcode: z.string().min(5).max(10),
  country: z.string().default("United Kingdom"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

const CreateOrderSchema = z.object({
  farm_id: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1),
  // Either address_id (saved address) OR manual address
  address_id: z.string().uuid().optional(),
  address: AddressSchema.optional(),
  delivery_address: z.string().min(10).optional(), // Legacy: plain text address
  delivery_notes: z.string().optional(),
}).refine(
  (data) => data.address_id || data.address || data.delivery_address,
  { message: "Either address_id, address, or delivery_address is required" }
);

/**
 * POST /api/orders
 * Create a new order for the authenticated customer
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      if (process.env.NODE_ENV === "development") {
        console.log("[orders] Auth error:", authError.message);
      }
      return NextResponse.json(
        { error: "Authentication failed. Please log in again.", code: "AUTH_ERROR" },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to place an order", code: "NOT_LOGGED_IN" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[orders] Request body:", JSON.stringify(body, null, 2));
    }

    const validation = CreateOrderSchema.safeParse(body);
    
    if (!validation.success) {
      const errors = validation.error.flatten();
      if (process.env.NODE_ENV === "development") {
        console.log("[orders] Validation errors:", JSON.stringify(errors, null, 2));
      }
      
      // Build user-friendly error message
      const fieldErrors = errors.fieldErrors;
      let errorMessage = "Invalid order data";
      
      if (fieldErrors.farm_id) {
        errorMessage = "Invalid farm selection";
      } else if (fieldErrors.items) {
        errorMessage = "Invalid items in cart";
      } else if (fieldErrors.delivery_address || fieldErrors.address || fieldErrors.address_id) {
        errorMessage = "Please provide a delivery address";
      }
      
      return NextResponse.json(
        { error: errorMessage, code: "VALIDATION_ERROR", details: errors },
        { status: 400 }
      );
    }

    const { farm_id, items, address_id, address, delivery_address: legacyAddress, delivery_notes } = validation.data;

    // 3. Resolve delivery address
    let deliveryAddressString: string;
    let deliveryAddressJson: DeliveryAddressJson | null = null;

    if (address_id) {
      // Fetch saved address
      const { data: savedAddress, error: addressError } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", address_id)
        .eq("user_id", user.id)
        .single();

      if (addressError || !savedAddress) {
        return NextResponse.json(
          { error: "Saved address not found", code: "ADDRESS_NOT_FOUND" },
          { status: 400 }
        );
      }

      const addr = savedAddress as Address;
      deliveryAddressJson = {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        city: addr.city,
        county: addr.county || undefined,
        postcode: addr.postcode,
        country: addr.country,
        latitude: addr.latitude || undefined,
        longitude: addr.longitude || undefined,
      };
      deliveryAddressString = formatAddressString(deliveryAddressJson);
    } else if (address) {
      // Manual address entry
      deliveryAddressJson = {
        line1: address.line1,
        line2: address.line2 || undefined,
        city: address.city,
        county: address.county || undefined,
        postcode: address.postcode,
        country: address.country,
        latitude: address.latitude || undefined,
        longitude: address.longitude || undefined,
      };
      deliveryAddressString = formatAddressString(deliveryAddressJson);
    } else if (legacyAddress) {
      // Legacy plain text address
      deliveryAddressString = legacyAddress;
    } else {
      return NextResponse.json(
        { error: "Delivery address is required", code: "MISSING_ADDRESS" },
        { status: 400 }
      );
    }

    // 4. Verify farm exists and is approved, get contact email
    const { data: farmData, error: farmError } = await supabase
      .from("farms")
      .select("id, name, owner_user_id, delivery_fee, min_order_value, status, contact_email")
      .eq("id", farm_id)
      .eq("status", "approved")
      .single();

    if (farmError) {
      if (process.env.NODE_ENV === "development") {
        console.log("[orders] Farm lookup error:", farmError.message);
      }
    }

    if (!farmData) {
      return NextResponse.json(
        { error: "Farm not found or not available for orders", code: "FARM_NOT_FOUND" },
        { status: 400 }
      );
    }

    const farm = farmData as Pick<Farm, "id" | "name" | "owner_user_id" | "delivery_fee" | "min_order_value" | "status" | "contact_email">;

    // 5. Fetch products and validate they belong to the farm
    const productIds = items.map((item) => item.product_id);
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, unit_label, weight_label, stock_qty, is_active, farm_id")
      .in("id", productIds)
      .eq("farm_id", farm_id)
      .eq("is_active", true);

    if (productsError) {
      console.error("[orders] Error fetching products:", productsError);
      return NextResponse.json(
        { error: "Failed to validate products" },
        { status: 500 }
      );
    }

    if (!productsData || productsData.length !== items.length) {
      return NextResponse.json(
        { error: "Some products are not available or don't belong to this farm" },
        { status: 400 }
      );
    }

    const products = productsData as Pick<Product, "id" | "name" | "price" | "unit_label" | "weight_label" | "stock_qty" | "is_active" | "farm_id">[];

    // 6. Build order items with server-side prices (don't trust client)
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderItems: Array<{
      product_id: string;
      name_snapshot: string;
      price_snapshot: number;
      quantity: number;
      unit_snapshot: string;
      weight_snapshot: string | null;
    }> = [];

    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found` },
          { status: 400 }
        );
      }

      // Check stock
      if (product.stock_qty !== null && product.stock_qty < item.quantity) {
        return NextResponse.json(
          { error: `Not enough stock for ${product.name}. Available: ${product.stock_qty}` },
          { status: 400 }
        );
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        product_id: product.id,
        name_snapshot: product.name,
        price_snapshot: product.price,
        quantity: item.quantity,
        unit_snapshot: product.unit_label,
        weight_snapshot: product.weight_label,
      });
    }

    // 7. Check minimum order value
    const minOrderValue = farm.min_order_value || 0;
    if (subtotal < minOrderValue) {
      return NextResponse.json(
        { 
          error: `Minimum order value is £${(minOrderValue / 100).toFixed(2)}. Your subtotal is £${(subtotal / 100).toFixed(2)}` 
        },
        { status: 400 }
      );
    }

    // 8. Calculate totals
    const deliveryFee = farm.delivery_fee || 0;
    const total = subtotal + deliveryFee;

    // 9. Generate order number
    const { data: orderNumberResult, error: orderNumberError } = await supabase
      .rpc("generate_order_number");

    if (orderNumberError) {
      console.error("[orders] Error generating order number:", orderNumberError);
    }

    const orderNumber = orderNumberResult || 
      `FD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now() % 10000).padStart(4, "0")}`;

    // 10. Create order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderError } = await (supabase as any)
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_user_id: user.id,
        farm_id: farm_id,
        status: "processing",
        payment_status: "paid",
        subtotal,
        delivery_fee: deliveryFee,
        total,
        delivery_address: deliveryAddressString,
        delivery_address_json: deliveryAddressJson,
        delivery_notes: delivery_notes || null,
        customer_email_snapshot: user.email,
      })
      .select("id, order_number")
      .single();

    if (orderError || !orderData) {
      console.error("[orders] Error creating order:", orderError);
      return NextResponse.json(
        { error: "Failed to create order. Please try again." },
        { status: 500 }
      );
    }

    const order = orderData as { id: string; order_number: string };

    // 11. Create order items
    const orderItemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase as any)
      .from("order_items")
      .insert(orderItemsWithOrderId);

    if (itemsError) {
      console.error("[orders] Error creating order items:", itemsError);
      return NextResponse.json(
        { error: "Failed to create order items. Please contact support." },
        { status: 500 }
      );
    }

    // 12. Create initial order event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: eventError } = await (supabase as any)
      .from("order_events")
      .insert({
        order_id: order.id,
        actor_user_id: user.id,
        actor_role: "customer",
        status_from: null,
        status_to: "processing",
        note: "Order placed",
      });

    if (eventError) {
      console.error("[orders] Error creating order event:", eventError);
    }

    // 13. Send notification emails (non-blocking)
    const emailItems = orderItems.map((item) => ({
      name: item.name_snapshot,
      quantity: item.quantity,
      price: item.price_snapshot * item.quantity,
    }));

    // Get customer name from profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    const customerName = (profileData as { name: string | null } | null)?.name || undefined;

    // Send customer confirmation
    sendOrderConfirmationEmail({
      order_number: orderNumber,
      customer_email: user.email!,
      customer_name: customerName,
      farm_name: farm.name,
      items: emailItems,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      delivery_address: deliveryAddressString,
    }).catch((err) => {
      console.error("[orders] Error sending customer email:", err);
    });

    // Get farm owner email
    if (farm.contact_email || farm.owner_user_id) {
      let farmEmail: string | undefined = farm.contact_email ?? undefined;
      
      if (!farmEmail) {
        // Fetch from auth user
        const { data: farmOwner } = await supabase.auth.admin.getUserById(farm.owner_user_id);
        farmEmail = farmOwner?.user?.email;
      }

      if (farmEmail) {
        sendNewOrderFarmEmail({
          order_number: orderNumber,
          farm_email: farmEmail,
          farm_name: farm.name,
          customer_name: customerName,
          items: emailItems,
          total,
          delivery_address: deliveryAddressString,
          delivery_notes: delivery_notes ?? undefined,
        }).catch((err) => {
          console.error("[orders] Error sending farm email:", err);
        });
      }
    }

    // Send admin notification
    sendNewOrderAdminEmail({
      order_number: orderNumber,
      farm_name: farm.name,
      customer_email: user.email!,
      total,
    }).catch((err) => {
      console.error("[orders] Error sending admin email:", err);
    });

    console.log("[orders] ORDER CREATED:", {
      order_number: order.order_number,
      order_id: order.id,
      customer_id: user.id,
      farm_name: farm.name,
      total: `£${(total / 100).toFixed(2)}`,
      items: orderItems.length,
    });

    // 14. Return success
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
      },
    });

  } catch (error) {
    console.error("[orders] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
