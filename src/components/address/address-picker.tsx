"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Check, Loader2, X, Search, Home, Briefcase, Building2 } from "lucide-react";
import type { Address } from "@/types/database";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/hooks/use-mounted";

interface AddressPickerProps {
  onSelect: (address: Address | NewAddressData | null) => void;
  selectedAddressId?: string;
  showSaveOption?: boolean;
}

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

interface PostcodeResult {
  postcode: string;
  admin_district: string;
  admin_county: string | null;
  latitude: number;
  longitude: number;
}

const LABEL_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="h-4 w-4" />,
  Work: <Briefcase className="h-4 w-4" />,
  Other: <Building2 className="h-4 w-4" />,
};

export function AddressPicker({ onSelect, selectedAddressId, showSaveOption = true }: AddressPickerProps) {
  const mounted = useMounted();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(selectedAddressId || null);

  // New address form state
  const [postcode, setPostcode] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [postcodeResult, setPostcodeResult] = useState<PostcodeResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [label, setLabel] = useState("Home");

  // Fetch saved addresses
  useEffect(() => {
    async function fetchAddresses() {
      try {
        const response = await fetch("/api/address", {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          setAddresses(data.data || []);
          
          // Auto-select default address if none selected
          if (!selectedAddressId) {
            const defaultAddr = data.data?.find((a: Address) => a.is_default);
            if (defaultAddr) {
              setSelectedId(defaultAddr.id);
              onSelect(defaultAddr);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch addresses:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (mounted) {
      fetchAddresses();
    }
  }, [mounted, selectedAddressId, onSelect]);

  // Postcode lookup with debounce
  const lookupPostcode = useCallback(async (code: string) => {
    const normalized = code.replace(/\s+/g, "").toUpperCase();
    if (normalized.length < 5) {
      setPostcodeResult(null);
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const response = await fetch(`/api/address/postcode?code=${encodeURIComponent(normalized)}`);
      const data = await response.json();

      if (data.success && data.data) {
        setPostcodeResult(data.data);
        setCity(data.data.admin_district);
        setCounty(data.data.admin_county || "");
      } else {
        setLookupError("Postcode not found. Please enter address manually.");
        setPostcodeResult(null);
      }
    } catch {
      setLookupError("Failed to look up postcode");
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  // Debounced postcode input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (postcode.length >= 5) {
        lookupPostcode(postcode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [postcode, lookupPostcode]);

  // Handle address selection
  function handleSelectAddress(address: Address) {
    setSelectedId(address.id);
    setShowNewForm(false);
    onSelect(address);
  }

  // Handle new address submission
  function handleNewAddress() {
    if (!line1 || !city || !postcode) return;

    const newAddress: NewAddressData = {
      isNew: true,
      line1,
      line2: line2 || undefined,
      city,
      county: county || undefined,
      postcode: postcode.replace(/\s+/g, "").toUpperCase(),
      country: "United Kingdom",
      label,
      latitude: postcodeResult?.latitude,
      longitude: postcodeResult?.longitude,
    };

    setSelectedId("new");
    onSelect(newAddress);
  }

  // Clear new address form
  function clearForm() {
    setPostcode("");
    setLine1("");
    setLine2("");
    setCity("");
    setCounty("");
    setLabel("Home");
    setPostcodeResult(null);
    setLookupError(null);
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saved Addresses */}
      {addresses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Saved Addresses</p>
          {addresses.map((address) => (
            <button
              key={address.id}
              type="button"
              onClick={() => handleSelectAddress(address)}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                selectedId === address.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:border-primary/50 hover:bg-accent"
              )}
            >
              <div className="mt-0.5 text-muted-foreground">
                {LABEL_ICONS[address.label] || <MapPin className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{address.label}</span>
                  {address.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                  , {address.city}, {address.postcode}
                </p>
              </div>
              {selectedId === address.id && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add New Address Button */}
      {!showNewForm && (
        <button
          type="button"
          onClick={() => {
            setShowNewForm(true);
            setSelectedId("new");
            clearForm();
          }}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border border-dashed hover:border-primary hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Address</span>
        </button>
      )}

      {/* New Address Form */}
      {showNewForm && (
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">New Delivery Address</h4>
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false);
                setSelectedId(null);
                onSelect(null);
                clearForm();
              }}
              className="p-1 rounded hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Postcode Lookup */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Postcode *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="SW1A 1AA"
                className="w-full pl-10 pr-10 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {isLookingUp && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {postcodeResult && !isLookingUp && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>
            {lookupError && (
              <p className="text-xs text-amber-600">{lookupError}</p>
            )}
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Address Line 1 *</label>
            <input
              type="text"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="House number and street"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Address Line 2</label>
            <input
              type="text"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              placeholder="Flat, unit, building (optional)"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* City and County */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="County (optional)"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Label Selection */}
          {showSaveOption && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <div className="flex gap-2">
                {["Home", "Work", "Other"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLabel(l)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                      label === l
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {LABEL_ICONS[l]}
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Use This Address Button */}
          <button
            type="button"
            onClick={handleNewAddress}
            disabled={!line1 || !city || !postcode}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="h-4 w-4" />
            Use This Address
          </button>
        </div>
      )}
    </div>
  );
}
