"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  min = 0,
  max,
  disabled = false,
  size = "md",
}: QuantityStepperProps) {
  const canDecrement = !disabled && quantity > min;
  const canIncrement = !disabled && (max === undefined || quantity < max);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-background",
        size === "sm" ? "h-8" : "h-10"
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={!canDecrement}
        className={cn(
          "flex items-center justify-center rounded-l-lg border-r transition-colors",
          "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
          size === "sm" ? "h-8 w-8" : "h-10 w-10"
        )}
        aria-label="Decrease quantity"
      >
        <Minus className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      </button>
      
      <span
        className={cn(
          "flex items-center justify-center font-medium tabular-nums",
          size === "sm" ? "min-w-[2rem] text-sm" : "min-w-[3rem] text-base"
        )}
      >
        {quantity}
      </span>
      
      <button
        type="button"
        onClick={onIncrement}
        disabled={!canIncrement}
        className={cn(
          "flex items-center justify-center rounded-r-lg border-l transition-colors",
          "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
          size === "sm" ? "h-8 w-8" : "h-10 w-10"
        )}
        aria-label="Increase quantity"
      >
        <Plus className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      </button>
    </div>
  );
}
