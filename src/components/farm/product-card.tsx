"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Plus } from "lucide-react";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useCartStore, useCartItemQuantity, formatPrice } from "@/lib/stores/cart";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useAuth } from "@/lib/hooks/use-auth";
import { AuthRequiredModal } from "@/components/auth/auth-required-modal";
import { isInStock, getStockStatus, getStockStatusClass } from "@/lib/utils/product-helpers";
import type { Product, Farm } from "@/types/database";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  farm: Farm;
  onDifferentFarm?: (currentFarm: { name: string }, newFarm: { name: string }) => void;
}

export function ProductCard({ product, farm, onDifferentFarm }: ProductCardProps) {
  const mounted = useMounted();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartQuantity = useCartItemQuantity(product.id);
  const [isAdding, setIsAdding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Use 0 as cartQuantity until mounted to prevent hydration mismatch
  const displayQuantity = mounted ? cartQuantity : 0;

  const inStock = isInStock(product);
  const stockStatus = getStockStatus(product);
  const stockClass = getStockStatusClass(product);
  const maxQty = product.stock_qty ?? undefined;

  const handleAddToCart = () => {
    if (!inStock) return;
    
    // Gate add-to-cart behind authentication
    if (!authLoading && !isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsAdding(true);
    const result = addItem(product, farm);

    if (!result.success && result.reason === "different_farm") {
      onDifferentFarm?.(
        { name: result.currentFarm.name },
        { name: result.newFarm.name }
      );
    }

    setTimeout(() => setIsAdding(false), 200);
  };

  const handleIncrement = () => {
    // Gate behind authentication
    if (!authLoading && !isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    if (maxQty !== undefined && cartQuantity >= maxQty) return;
    const result = addItem(product, farm);
    if (!result.success && result.reason === "different_farm") {
      onDifferentFarm?.(
        { name: result.currentFarm.name },
        { name: result.newFarm.name }
      );
    }
  };

  const handleDecrement = () => {
    if (cartQuantity > 0) {
      updateQuantity(product.id, cartQuantity - 1);
    }
  };

  return (
    <>
    <AuthRequiredModal
      isOpen={showAuthModal}
      onClose={() => setShowAuthModal(false)}
    />
    <article className="group relative rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-earth-100 to-farm-100">
            <span className="text-3xl">🥩</span>
          </div>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-red-600">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Name and weight */}
        <div>
          <h3 className="font-medium text-foreground line-clamp-1">
            {product.name}
          </h3>
          {product.weight_label && (
            <p className="text-sm text-muted-foreground">{product.weight_label}</p>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price and stock */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="font-semibold text-foreground">
              {formatPrice(product.price)}
            </p>
            <p className={cn("text-xs", stockClass)}>{stockStatus}</p>
          </div>
        </div>

        {/* Add to cart / Quantity stepper */}
        <div className="pt-2">
          {displayQuantity > 0 ? (
            <QuantityStepper
              quantity={displayQuantity}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              min={0}
              max={maxQty}
              size="sm"
            />
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                inStock
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
                isAdding && "scale-95"
              )}
            >
              {inStock ? (
                <>
                  <Plus className="h-4 w-4" />
                  Add to Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  Unavailable
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
    </>
  );
}

// Loading skeleton
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
