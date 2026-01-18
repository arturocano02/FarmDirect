"use client";

import { Modal } from "@/components/ui/modal";
import { AlertTriangle } from "lucide-react";

interface DifferentFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearCart: () => void;
  currentFarmName: string;
  newFarmName: string;
}

export function DifferentFarmModal({
  isOpen,
  onClose,
  onClearCart,
  currentFarmName,
  newFarmName,
}: DifferentFarmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        
        <h2 className="font-display text-xl font-semibold mb-2">
          One Farm Per Order
        </h2>
        
        <p className="text-muted-foreground mb-6">
          Your cart contains items from <strong>{currentFarmName}</strong>. 
          To add items from <strong>{newFarmName}</strong>, you&apos;ll need to 
          start a new order.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onClearCart();
              onClose();
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Clear Cart & Continue with {newFarmName}
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg border hover:bg-accent transition-colors text-sm font-medium"
          >
            Keep Current Cart
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          This helps ensure your order is fulfilled properly and arrives fresh.
        </p>
      </div>
    </Modal>
  );
}
