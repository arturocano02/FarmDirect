/**
 * Product Data Access Layer
 * Server-side functions for fetching product data
 * 
 * All functions use the anonymous Supabase client and work WITHOUT login.
 * RLS policies allow public read of active products from approved farms.
 */

import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types/database";

/**
 * Creates an anonymous Supabase client for public data access
 * Does NOT use cookies/sessions - pure anonymous access
 */
function createAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get all active products for a farm by ID
 * Works WITHOUT authentication
 */
export async function getProductsByFarmId(farmId: string): Promise<Product[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) {
    console.error("[products] ERROR fetching products for farm:", {
      farmId,
      message: error.message,
      code: error.code,
    });
    return [];
  }

  return (data || []) as unknown as Product[];
}

/**
 * Get all active products for a farm by slug
 * Works WITHOUT authentication
 */
export async function getProductsByFarmSlug(slug: string): Promise<Product[]> {
  const supabase = createAnonClient();

  // First get the farm
  const { data: farm, error: farmError } = await supabase
    .from("farms")
    .select("id")
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (farmError || !farm) {
    if (farmError && farmError.code !== "PGRST116") {
      console.error("[products] ERROR fetching farm by slug:", {
        slug,
        message: farmError.message,
      });
    }
    return [];
  }

  const farmData = farm as unknown as { id: string };
  return getProductsByFarmId(farmData.id);
}

/**
 * Get a single product by ID
 * Works WITHOUT authentication
 */
export async function getProductById(productId: string): Promise<Product | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[products] ERROR fetching product:", {
        productId,
        message: error.message,
      });
    }
    return null;
  }

  return data as unknown as Product;
}

/**
 * Format price from pence to display string
 */
export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`;
}

/**
 * Check if product is in stock
 */
export function isInStock(product: Product): boolean {
  // null stock_qty means unlimited stock
  if (product.stock_qty === null) return true;
  return product.stock_qty > 0;
}

/**
 * Get stock status text
 */
export function getStockStatus(product: Product): string {
  if (product.stock_qty === null) return "In Stock";
  if (product.stock_qty === 0) return "Out of Stock";
  if (product.stock_qty <= 5) return `Only ${product.stock_qty} left`;
  return "In Stock";
}

/**
 * Get stock status color class
 */
export function getStockStatusClass(product: Product): string {
  if (product.stock_qty === null) return "text-green-600";
  if (product.stock_qty === 0) return "text-red-600";
  if (product.stock_qty <= 5) return "text-amber-600";
  return "text-green-600";
}
