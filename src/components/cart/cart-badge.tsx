"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/stores/cart";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

interface CartBadgeProps {
  className?: string;
}

export function CartBadge({ className }: CartBadgeProps) {
  const mounted = useMounted();
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <Link
      href="/cart"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent transition-colors",
        className
      )}
      aria-label={mounted ? `Cart with ${itemCount} items` : "Cart"}
    >
      <ShoppingCart className="h-5 w-5" />
      {/* Only show badge count after hydration to prevent mismatch */}
      {mounted && itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
