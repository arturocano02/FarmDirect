"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  MapPin, 
  Home, 
  Briefcase, 
  Tag,
  Trash2,
  Star,
  Loader2,
  AlertCircle
} from "lucide-react";
import type { Address } from "@/types/database";

const LABEL_ICONS: Record<string, typeof Home> = {
  Home: Home,
  Work: Briefcase,
  Other: Tag,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch("/api/address");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch addresses");
      }
      setAddresses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this address?")) return;
    
    setDeletingId(id);
    try {
      const response = await fetch(`/api/address?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id);
    try {
      const response = await fetch("/api/address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_default: true }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }
      // Update local state
      setAddresses(addresses.map(a => ({
        ...a,
        is_default: a.id === id,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSettingDefaultId(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Saved Addresses</h1>
            <p className="text-muted-foreground mt-1">
              Manage your delivery addresses
            </p>
          </div>
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Address
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No saved addresses</h3>
            <p className="text-muted-foreground mb-6">
              Add your first address during checkout
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => {
              const Icon = LABEL_ICONS[address.label] || MapPin;
              return (
                <div
                  key={address.id}
                  className="rounded-xl border p-4 hover:border-farm-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-farm-100 px-2 py-0.5 text-xs font-medium text-farm-700">
                              <Star className="h-3 w-3" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {address.line1}
                          {address.line2 && `, ${address.line2}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.postcode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!address.is_default && (
                        <button
                          onClick={() => handleSetDefault(address.id)}
                          disabled={settingDefaultId === address.id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {settingDefaultId === address.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Star className="h-3 w-3" />
                          )}
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(address.id)}
                        disabled={deletingId === address.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        {deletingId === address.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
