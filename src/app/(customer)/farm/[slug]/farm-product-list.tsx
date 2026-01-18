"use client";

import { useState } from "react";
import { ProductCard } from "@/components/farm/product-card";
import { DifferentFarmModal } from "@/components/cart/different-farm-modal";
import { useCartStore } from "@/lib/stores/cart";
import type { Farm, Product } from "@/types/database";

interface FarmProductListProps {
  farm: Farm;
  products: Product[];
}

export function FarmProductList({ farm, products }: FarmProductListProps) {
  const clearCart = useCartStore((state) => state.clearCart);
  const addItem = useCartStore((state) => state.addItem);
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    currentFarmName: string;
    newFarmName: string;
    pendingProduct: Product | null;
  }>({
    isOpen: false,
    currentFarmName: "",
    newFarmName: "",
    pendingProduct: null,
  });

  const handleDifferentFarm = (
    currentFarm: { name: string },
    newFarm: { name: string },
    product?: Product
  ) => {
    setModalState({
      isOpen: true,
      currentFarmName: currentFarm.name,
      newFarmName: newFarm.name,
      pendingProduct: product || null,
    });
  };

  const handleClearAndAdd = () => {
    clearCart();
    // If there's a pending product, add it after clearing
    if (modalState.pendingProduct) {
      addItem(modalState.pendingProduct, farm);
    }
    setModalState({
      isOpen: false,
      currentFarmName: "",
      newFarmName: "",
      pendingProduct: null,
    });
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border bg-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <span className="text-3xl">🥩</span>
        </div>
        <h3 className="font-display text-lg font-semibold mb-2">
          No products available
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          This farm doesn&apos;t have any products listed yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            farm={farm}
            onDifferentFarm={(currentFarm, newFarm) =>
              handleDifferentFarm(currentFarm, newFarm, product)
            }
          />
        ))}
      </div>

      <DifferentFarmModal
        isOpen={modalState.isOpen}
        onClose={() =>
          setModalState({
            isOpen: false,
            currentFarmName: "",
            newFarmName: "",
            pendingProduct: null,
          })
        }
        onClearCart={handleClearAndAdd}
        currentFarmName={modalState.currentFarmName}
        newFarmName={modalState.newFarmName}
      />
    </>
  );
}
