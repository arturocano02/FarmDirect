"use client";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import Link from "next/link";
import { Trash2, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { useCartStore, formatPrice } from "@/lib/stores/cart";
import { useMounted } from "@/lib/hooks/use-mounted";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { cn } from "@/lib/utils";
import { getProductFallbackImage } from "@/lib/utils/image-fallbacks";

export function CartContent() {
  const mounted = useMounted();
  const items = useCartStore((state) => state.items);
  const farm = useCartStore((state) => state.farm);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getDeliveryFee = useCartStore((state) => state.getDeliveryFee);
  const getTotal = useCartStore((state) => state.getTotal);
  const meetsMinimum = useCartStore((state) => state.meetsMinimum);
  const getMinimumOrderValue = useCartStore((state) => state.getMinimumOrderValue);

  // Show loading state until hydrated to prevent mismatch
  if (!mounted) {
    return <CartSkeleton />;
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();
  const minimumMet = meetsMinimum();
  const minimumOrder = getMinimumOrderValue();

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        {/* Farm header */}
        {farm && (
          <div className="flex items-center justify-between rounded-lg bg-farm-50 border border-farm-200 p-4">
            <div>
              <p className="text-sm text-farm-700 font-medium">
                Order from
              </p>
              <Link
                href={`/farm/${farm.slug}`}
                className="font-display text-lg font-semibold text-farm-800 hover:underline"
              >
                {farm.name}
              </Link>
            </div>
            <button
              onClick={clearCart}
              className="text-sm text-farm-700 hover:text-farm-900 hover:underline"
            >
              Clear cart
            </button>
          </div>
        )}

        {/* Items */}
        {items.map((item) => (
          <CartItem
            key={item.product.id}
            item={item}
            onUpdateQuantity={(qty) => updateQuantity(item.product.id, qty)}
            onRemove={() => removeItem(item.product.id)}
          />
        ))}
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 rounded-xl border bg-card p-6 space-y-6">
          <h2 className="font-display text-lg font-semibold">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Subtotal ({items.length} {items.length === 1 ? "item" : "items"})
              </span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Minimum order warning */}
          {!minimumMet && minimumOrder && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Add {formatPrice(minimumOrder - subtotal)} more to meet the minimum
                order of {formatPrice(minimumOrder)}
              </p>
            </div>
          )}

          <Link
            href={minimumMet ? "/checkout" : "#"}
            className={cn(
              "flex items-center justify-center gap-2 w-full rounded-lg px-6 py-3 text-sm font-medium transition-colors",
              minimumMet
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            onClick={(e) => {
              if (!minimumMet) e.preventDefault();
            }}
          >
            Proceed to Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="text-xs text-center text-muted-foreground">
            Delivery available on: {farm?.delivery_fee !== null ? "selected days" : "check farm page"}
          </p>
        </div>
      </div>
    </div>
  );
}

interface CartItemProps {
  item: {
    product: {
      id: string;
      name: string;
      price: number;
      image_url: string | null;
      weight_label: string | null;
      unit_label: string;
      stock_qty: number | null;
    };
    quantity: number;
  };
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const { product, quantity } = item;
  const maxQty = product.stock_qty ?? undefined;

  return (
    <div className="flex gap-4 rounded-xl border bg-card p-4">
      {/* Product image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        <ImageWithFallback
          src={product.image_url}
          fallbackSrc={getProductFallbackImage(product.name)}
          alt={product.name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Product details */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="font-medium line-clamp-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground">
            {product.weight_label} · {product.unit_label}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <QuantityStepper
            quantity={quantity}
            onIncrement={() => onUpdateQuantity(quantity + 1)}
            onDecrement={() => onUpdateQuantity(quantity - 1)}
            min={1}
            max={maxQty}
            size="sm"
          />
          <div className="text-right">
            <p className="font-semibold">
              {formatPrice(product.price * quantity)}
            </p>
            {quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                {formatPrice(product.price)} each
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="self-start p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="font-display text-xl font-semibold mb-2">
        Your cart is empty
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Looks like you haven&apos;t added any products yet. Browse our farms to find
        premium quality meat.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Browse Farms
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Loading cart...</p>
    </div>
  );
}
