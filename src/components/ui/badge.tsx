"use client";

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
  status?: OrderStatus;
  className?: string;
}

const statusColors: Record<OrderStatus, string> = {
  processing: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  preparing: "bg-amber-100 text-amber-800",
  ready_for_pickup: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  exception: "bg-red-100 text-red-800",
};

export function Badge({ children, variant = "default", status, className }: BadgeProps) {
  // If status is provided, use status-based colors
  if (status) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
          statusColors[status] || "bg-gray-100 text-gray-800",
          className
        )}
      >
        {children}
      </span>
    );
  }

  // Otherwise use variant-based styling
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-primary text-primary-foreground": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "border border-input bg-background": variant === "outline",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
