/**
 * Product Helper Utilities
 * Client-safe functions for working with products
 */

import type { Product } from "@/types/database";

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
