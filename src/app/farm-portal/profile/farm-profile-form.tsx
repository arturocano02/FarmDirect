"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, X, Store, AlertCircle, CheckCircle } from "lucide-react";
import type { Farm } from "@/types/database";

interface FarmProfileFormProps {
  farm: Farm;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const BADGE_OPTIONS = [
  "grass_fed",
  "organic",
  "free_range",
  "pasture_raised",
  "hormone_free",
  "antibiotic_free",
  "local",
  "sustainable",
  "regenerative",
  "family_owned",
];

export function FarmProfileForm({ farm }: FarmProfileFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(farm.name);
  const [shortDescription, setShortDescription] = useState(farm.short_description || "");
  const [story, setStory] = useState(farm.story || "");
  const [address, setAddress] = useState(farm.address || "");
  const [postcode, setPostcode] = useState(farm.postcode || "");
  const [postcodeRules, setPostcodeRules] = useState(farm.postcode_rules?.join(", ") || "");
  const [deliveryDays, setDeliveryDays] = useState<string[]>(farm.delivery_days || []);
  const [cutoffTime, setCutoffTime] = useState(farm.cutoff_time || "");
  const [minOrderValue, setMinOrderValue] = useState(farm.min_order_value ? (farm.min_order_value / 100).toFixed(2) : "");
  const [deliveryFee, setDeliveryFee] = useState(farm.delivery_fee ? (farm.delivery_fee / 100).toFixed(2) : "");
  const [badges, setBadges] = useState<string[]>(farm.badges || []);
  const [heroImageUrl, setHeroImageUrl] = useState(farm.hero_image_url || "");
  const [contactEmail, setContactEmail] = useState(farm.contact_email || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "farm-images");
      formData.append("path", `${farm.id}/${Date.now()}-hero.${file.name.split('.').pop()}`);

      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setHeroImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function toggleDeliveryDay(day: string) {
    setDeliveryDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function toggleBadge(badge: string) {
    setBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError("Farm name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        short_description: shortDescription.trim() || null,
        story: story.trim() || null,
        address: address.trim() || null,
        postcode: postcode.trim() || null,
        postcode_rules: postcodeRules ? postcodeRules.split(",").map((s) => s.trim()).filter(Boolean) : null,
        delivery_days: deliveryDays.length > 0 ? deliveryDays : null,
        cutoff_time: cutoffTime || null,
        min_order_value: minOrderValue ? Math.round(parseFloat(minOrderValue) * 100) : null,
        delivery_fee: deliveryFee ? Math.round(parseFloat(deliveryFee) * 100) : null,
        badges: badges.length > 0 ? badges : null,
        hero_image_url: heroImageUrl || null,
        contact_email: contactEmail.trim() || null,
      };

      const response = await fetch(`/api/farm/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
      }

      setSuccess(true);
      router.refresh();
      
      // Hide success after 3s
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status banner */}
      {farm.status === "pending" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Awaiting Approval</p>
            <p className="text-sm text-amber-700 mt-1">
              Your farm is under review. You can still edit while waiting.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          Profile saved successfully!
        </div>
      )}

      {/* Hero Image */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Hero Image</h2>
        
        <div className="flex items-start gap-6">
          <div className="relative h-32 w-48 rounded-lg bg-muted overflow-hidden shrink-0">
            {heroImageUrl ? (
              <>
                <Image
                  src={heroImageUrl}
                  alt="Farm hero"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setHeroImageUrl("")}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
              <div className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed px-4 py-3 hover:border-primary transition-colors">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {isUploading ? "Uploading..." : "Upload hero image"}
                </span>
              </div>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Recommended: 1200x600px. JPG, PNG or WebP. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Basic Information</h2>

        <div>
          <label className="block text-sm font-medium mb-2">
            Farm Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Short Description</label>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="A brief tagline for your farm"
            maxLength={200}
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Story</label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Tell customers about your farm..."
            rows={5}
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Contact Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="orders@yourfarm.com"
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            For order notifications. Defaults to your account email if empty.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Postcode</label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Farm Badges</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Select badges that apply to your farm
        </p>
        
        <div className="flex flex-wrap gap-2">
          {BADGE_OPTIONS.map((badge) => (
            <button
              key={badge}
              type="button"
              onClick={() => toggleBadge(badge)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                badges.includes(badge)
                  ? "bg-farm-600 text-white"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {badge.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Settings */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Delivery Settings</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Delivery Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDeliveryDay(day)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  deliveryDays.includes(day)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Delivery Postcodes</label>
          <input
            type="text"
            value={postcodeRules}
            onChange={(e) => setPostcodeRules(e.target.value)}
            placeholder="SW1, W1, NW1 (comma separated)"
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Enter postcode prefixes you deliver to, separated by commas
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Order Cutoff</label>
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Order (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Delivery Fee (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}
