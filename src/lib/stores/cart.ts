/**
 * Cart Store
 * Zustand store for managing shopping cart state
 * - Persists to localStorage
 * - Enforces one farm per cart
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, Farm } from "@/types/database";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartFarm {
  id: string;
  name: string;
  slug: string;
  delivery_fee: number | null;
  min_order_value: number | null;
  hero_image_url: string | null;
}

interface CartState {
  items: CartItem[];
  farm: CartFarm | null;
  
  // Actions
  addItem: (product: Product, farm: Farm) => AddItemResult;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  
  // Computed helpers
  getItemCount: () => number;
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  meetsMinimum: () => boolean;
  getMinimumOrderValue: () => number | null;
}

export type AddItemResult =
  | { success: true }
  | { success: false; reason: "different_farm"; currentFarm: CartFarm; newFarm: CartFarm };

// Default delivery fee if farm doesn't specify one (in pence)
const DEFAULT_DELIVERY_FEE = 499;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      farm: null,

      addItem: (product: Product, farm: Farm): AddItemResult => {
        const state = get();
        
        // Check if cart has items from a different farm
        if (state.farm && state.farm.id !== farm.id) {
          return {
            success: false,
            reason: "different_farm",
            currentFarm: state.farm,
            newFarm: {
              id: farm.id,
              name: farm.name,
              slug: farm.slug,
              delivery_fee: farm.delivery_fee,
              min_order_value: farm.min_order_value,
              hero_image_url: farm.hero_image_url,
            },
          };
        }

        // Check if product already in cart
        const existingItem = state.items.find((item) => item.product.id === product.id);

        if (existingItem) {
          // Increment quantity
          set({
            items: state.items.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          // Add new item
          set({
            items: [...state.items, { product, quantity: 1 }],
            farm: state.farm || {
              id: farm.id,
              name: farm.name,
              slug: farm.slug,
              delivery_fee: farm.delivery_fee,
              min_order_value: farm.min_order_value,
              hero_image_url: farm.hero_image_url,
            },
          });
        }

        return { success: true };
      },

      updateQuantity: (productId: string, quantity: number) => {
        const state = get();

        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          get().removeItem(productId);
          return;
        }

        // Check stock limit
        const item = state.items.find((i) => i.product.id === productId);
        if (item && item.product.stock_qty !== null && quantity > item.product.stock_qty) {
          quantity = item.product.stock_qty;
        }

        set({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        });
      },

      removeItem: (productId: string) => {
        const state = get();
        const newItems = state.items.filter((item) => item.product.id !== productId);

        set({
          items: newItems,
          // Clear farm if cart is now empty
          farm: newItems.length === 0 ? null : state.farm,
        });
      },

      clearCart: () => {
        set({ items: [], farm: null });
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
      },

      getDeliveryFee: () => {
        const state = get();
        if (state.items.length === 0) return 0;
        return state.farm?.delivery_fee ?? DEFAULT_DELIVERY_FEE;
      },

      getTotal: () => {
        return get().getSubtotal() + get().getDeliveryFee();
      },

      meetsMinimum: () => {
        const state = get();
        const minOrder = state.farm?.min_order_value;
        if (!minOrder) return true;
        return state.getSubtotal() >= minOrder;
      },

      getMinimumOrderValue: () => {
        return get().farm?.min_order_value ?? null;
      },
    }),
    {
      name: "farmdirect-cart",
      // Only persist specific fields
      partialize: (state) => ({
        items: state.items,
        farm: state.farm,
      }),
    }
  )
);

/**
 * Hook to get cart item quantity for a specific product
 */
export function useCartItemQuantity(productId: string): number {
  return useCartStore((state) => {
    const item = state.items.find((i) => i.product.id === productId);
    return item?.quantity ?? 0;
  });
}

/**
 * Format price from pence to display string
 */
export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`;
}
