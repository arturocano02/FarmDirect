"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Loader2, Upload, X } from "lucide-react";
import type { Product } from "@/types/database";
import { getProductFallbackImage } from "@/lib/utils/image-fallbacks";

interface ProductFormProps {
  product?: Product;
  farmId: string;
}

export function ProductForm({ product, farmId }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;

  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product ? (product.price / 100).toFixed(2) : "");
  const [unitLabel, setUnitLabel] = useState(product?.unit_label || "per pack");
  const [weightLabel, setWeightLabel] = useState(product?.weight_label || "");
  const [stockQty, setStockQty] = useState(product?.stock_qty?.toString() || "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
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
      formData.append("bucket", "product-images");
      formData.append("path", `${farmId}/${Date.now()}-${file.name}`);

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
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate
    if (!name.trim()) {
      setError("Product name is required");
      return;
    }

    const priceInPence = Math.round(parseFloat(price) * 100);
    if (isNaN(priceInPence) || priceInPence <= 0) {
      setError("Please enter a valid price");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: priceInPence,
        unit_label: unitLabel.trim(),
        weight_label: weightLabel.trim() || null,
        stock_qty: stockQty ? parseInt(stockQty) : null,
        is_active: isActive,
        image_url: imageUrl || null,
        farm_id: farmId,
      };

      const url = isEditing
        ? `/api/farm/products/${product.id}`
        : "/api/farm/products";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save product");
      }

      router.push("/farm-portal/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm("Are you sure you want to delete this product?")) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/farm/products/${product.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete product");
      }

      router.push("/farm-portal/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Image Upload */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Product Image</h2>
        
        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="relative h-32 w-32 rounded-lg bg-muted overflow-hidden shrink-0">
            <ImageWithFallback
              src={imageUrl}
              fallbackSrc={getProductFallbackImage(name)}
              alt="Product"
              fill
              className="object-cover"
            />
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Upload */}
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
                  {isUploading ? "Uploading..." : "Upload image"}
                </span>
              </div>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              JPG, PNG or WebP. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Basic Information</h2>

        <div>
          <label className="block text-sm font-medium mb-2">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Ribeye Steak"
            required
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product..."
            rows={3}
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Price (£) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="12.99"
              required
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Unit Label</label>
            <select
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            >
              <option value="per pack">per pack</option>
              <option value="per kg">per kg</option>
              <option value="per item">per item</option>
              <option value="each">each</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Weight Label</label>
            <input
              type="text"
              value={weightLabel}
              onChange={(e) => setWeightLabel(e.target.value)}
              placeholder="e.g., 500g, 1kg"
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Stock Quantity</label>
            <input
              type="number"
              min="0"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              placeholder="Leave empty for unlimited"
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Status</h2>
        
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <div>
            <p className="font-medium">Active</p>
            <p className="text-sm text-muted-foreground">
              Product is visible to customers
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete Product
          </button>
        )}
        
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
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
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Product"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
