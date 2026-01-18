"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/stores/cart";
import { AddressPicker } from "@/components/address/address-picker";
import { Loader2, ShoppingBag, ArrowLeft, MapPin, FileText, AlertCircle } from "lucide-react";
import type { Address } from "@/types/database";

interface NewAddressData {
  isNew: true;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  label: string;
  latitude?: number;
  longitude?: number;
}

type SelectedAddress = Address | NewAddressData | null;

export function CheckoutForm() {
  const router = useRouter();
  const { items, farm, getSubtotal, getDeliveryFee, getTotal, clearCart } = useCartStore();
  
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize the callback to prevent infinite loops
  const handleAddressSelect = useCallback((address: SelectedAddress) => {
    setSelectedAddress(address);
  }, []);

  // Don't render until mounted (hydration)
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty cart check
  if (items.length === 0 || !farm) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="font-display text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">Add some products before checking out.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Browse Farms
        </Link>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedAddress) {
      setError("Please select or enter a delivery address");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build order payload
      type OrderPayload = {
        farm_id: string;
        items: Array<{ product_id: string; quantity: number }>;
        address_id?: string;
        address?: {
          line1: string;
          line2?: string;
          city: string;
          county?: string;
          postcode: string;
          country: string;
          latitude?: number;
          longitude?: number;
        };
        delivery_notes?: string;
      };

      const payload: OrderPayload = {
        farm_id: farm!.id,
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };

      // Add address - either by ID or as new address
      if ("isNew" in selectedAddress && selectedAddress.isNew) {
        // New address
        payload.address = {
          line1: selectedAddress.line1,
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          county: selectedAddress.county,
          postcode: selectedAddress.postcode,
          country: selectedAddress.country,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        };

        // Optionally save the new address
        if (saveAddress) {
          try {
            await fetch("/api/address", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                label: selectedAddress.label,
                ...payload.address,
                is_default: false,
              }),
            });
          } catch (saveErr) {
            console.error("[checkout] Error saving address:", saveErr);
            // Continue with order even if address save fails
          }
        }
      } else {
        // Existing saved address
        payload.address_id = (selectedAddress as Address).id;
      }
      
      // Only include delivery_notes if it has content
      if (deliveryNotes.trim()) {
        payload.delivery_notes = deliveryNotes.trim();
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[checkout] Submitting order:", payload);
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[checkout] Response:", response.status, data);
      }

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === "NOT_LOGGED_IN" || data.code === "AUTH_ERROR") {
          throw new Error("Please log in to place an order");
        }
        throw new Error(data.error || "Failed to create order");
      }

      // Success! Clear cart and redirect to order page
      clearCart();
      router.push(`/order/${data.order.id}?new=true`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get address display string
  function getAddressDisplayString(): string {
    if (!selectedAddress) return "";
    
    if ("isNew" in selectedAddress && selectedAddress.isNew) {
      return [
        selectedAddress.line1,
        selectedAddress.line2,
        selectedAddress.city,
        selectedAddress.postcode,
      ].filter(Boolean).join(", ");
    }
    
    const addr = selectedAddress as Address;
    return [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(", ");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Checkout form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error display */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Order failed</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery address */}
          <div className="rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-farm-100 text-farm-700">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-semibold">
                Delivery Address
              </h2>
            </div>
            
            <AddressPicker
              onSelect={handleAddressSelect}
              showSaveOption={true}
            />

            {/* Save address checkbox for new addresses */}
            {selectedAddress && "isNew" in selectedAddress && selectedAddress.isNew && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Save this address for future orders
              </label>
            )}
          </div>

          {/* Delivery notes */}
          <div className="rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-farm-100 text-farm-700">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-semibold">
                Delivery Notes
              </h2>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-2">
                Special Instructions (optional)
              </label>
              <textarea
                id="notes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="E.g., Leave at back door, call on arrival, etc."
                rows={2}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          {/* Payment placeholder */}
          <div className="rounded-xl border border-dashed p-6 bg-muted/30">
            <h2 className="font-display text-lg font-semibold text-muted-foreground">
              💳 Payment
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Stripe payment integration coming soon. For now, orders are placed as &quot;paid&quot; for testing.
            </p>
          </div>

          {/* Back link */}
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </Link>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border p-6">
            <h2 className="font-display text-lg font-semibold">Order Summary</h2>
            
            {/* Farm info */}
            <div className="mt-4 flex items-center gap-3 pb-4 border-b">
              {farm.hero_image_url && (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={farm.hero_image_url}
                    alt={farm.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              )}
              <div>
                <p className="font-medium">{farm.name}</p>
                <p className="text-xs text-muted-foreground">{items.length} items</p>
              </div>
            </div>

            {/* Items */}
            <div className="mt-4 space-y-3 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}× {item.product.name}
                  </span>
                  <span>£{((item.product.price * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Delivery address preview */}
            {selectedAddress && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Delivering to
                </p>
                <p className="text-foreground">{getAddressDisplayString()}</p>
              </div>
            )}

            {/* Totals */}
            <div className="mt-6 space-y-3 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>£{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span>£{(deliveryFee / 100).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>£{(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedAddress}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing order...
                </>
              ) : (
                <>Place Order • £{(total / 100).toFixed(2)}</>
              )}
            </button>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              By placing this order, you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
