"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Store,
  Truck,
  Package,
  ImageIcon,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  X,
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FarmSetupWizardProps {
  userId: string;
  userEmail: string;
  existingFarm?: ExistingFarm | null;
}

interface ExistingFarm {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  story: string | null;
  address: string | null;
  postcode: string | null;
  postcode_rules: string[] | null;
  delivery_days: string[] | null;
  cutoff_time: string | null;
  min_order_value: number | null;
  delivery_fee: number | null;
  hero_image_url: string | null;
  logo_url: string | null;
  contact_email: string | null;
  status: string;
}

interface ExistingProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit_label: string;
  weight_label: string | null;
  stock_qty: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface ProductDraft {
  id: string;
  name: string;
  description: string;
  price: string;
  unit_label: string;
  weight_label: string;
  stock_qty: string;
  image_url: string;
  is_active: boolean;
  isNew: boolean;
  isDeleted?: boolean;
}

const STEPS = [
  { step: 1, title: "Basic Info", icon: Store },
  { step: 2, title: "Delivery", icon: Truck },
  { step: 3, title: "Branding", icon: ImageIcon },
  { step: 4, title: "Products", icon: Package },
  { step: 5, title: "Review", icon: ClipboardCheck },
] as const;

const DELIVERY_DAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const CUTOFF_TIMES = [
  { value: "10:00", label: "10:00 AM" },
  { value: "12:00", label: "12:00 PM (noon)" },
  { value: "14:00", label: "2:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "20:00", label: "8:00 PM" },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateProductId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function FarmSetupWizard({ userId, userEmail, existingFarm }: FarmSetupWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [farmId, setFarmId] = useState<string | null>(existingFarm?.id || null);

  // Step 1: Basic Info
  const [farmName, setFarmName] = useState(existingFarm?.name || "");
  const [farmSlug, setFarmSlug] = useState(existingFarm?.slug || "");
  const [shortDescription, setShortDescription] = useState(existingFarm?.short_description || "");
  const [story, setStory] = useState(existingFarm?.story || "");
  const [contactEmail, setContactEmail] = useState(existingFarm?.contact_email || userEmail);

  // Step 2: Location & Delivery
  const [address, setAddress] = useState(existingFarm?.address || "");
  const [postcode, setPostcode] = useState(existingFarm?.postcode || "");
  const [postcodeRules, setPostcodeRules] = useState(
    existingFarm?.postcode_rules?.join(", ") || ""
  );
  const [deliveryDays, setDeliveryDays] = useState<string[]>(
    existingFarm?.delivery_days || []
  );
  const [cutoffTime, setCutoffTime] = useState(existingFarm?.cutoff_time || "18:00");
  const [minOrderValue, setMinOrderValue] = useState(
    existingFarm?.min_order_value ? (existingFarm.min_order_value / 100).toFixed(2) : "20.00"
  );
  const [deliveryFee, setDeliveryFee] = useState(
    existingFarm?.delivery_fee ? (existingFarm.delivery_fee / 100).toFixed(2) : "4.99"
  );

  // Step 3: Branding
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(existingFarm?.hero_image_url || "");
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(existingFarm?.hero_image_url || null);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState(existingFarm?.logo_url || "");
  const [logoPreview, setLogoPreview] = useState<string | null>(existingFarm?.logo_url || null);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Step 4: Products
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Load existing products if farm exists
  useEffect(() => {
    async function loadProducts(fId: string) {
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("farm_id", fId)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setProducts(
            data.map((p: ExistingProduct) => ({
              id: p.id,
              name: p.name,
              description: p.description || "",
              price: (p.price / 100).toFixed(2),
              unit_label: p.unit_label,
              weight_label: p.weight_label || "",
              stock_qty: p.stock_qty?.toString() || "",
              image_url: p.image_url || "",
              is_active: p.is_active,
              isNew: false,
            }))
          );
        } else {
          setProducts([
            {
              id: generateProductId(),
              name: "",
              description: "",
              price: "",
              unit_label: "per pack",
              weight_label: "",
              stock_qty: "",
              image_url: "",
              is_active: true,
              isNew: true,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoadingProducts(false);
      }
    }

    if (existingFarm?.id) {
      loadProducts(existingFarm.id);
    } else {
      // Initialize with one empty product
      setProducts([
        {
          id: generateProductId(),
          name: "",
          description: "",
          price: "",
          unit_label: "per pack",
          weight_label: "",
          stock_qty: "",
          image_url: "",
          is_active: true,
          isNew: true,
        },
      ]);
    }
  }, [existingFarm?.id, supabase]);

  // Auto-generate slug from farm name
  const handleFarmNameChange = (name: string) => {
    setFarmName(name);
    if (!existingFarm) {
      setFarmSlug(generateSlug(name));
    }
  };

  // Product handlers
  const updateProduct = (id: string, field: keyof ProductDraft, value: string | boolean) => {
    setProducts(products.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: generateProductId(),
        name: "",
        description: "",
        price: "",
        unit_label: "per pack",
        weight_label: "",
        stock_qty: "",
        image_url: "",
        is_active: true,
        isNew: true,
      },
    ]);
  };

  const removeProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (product?.isNew) {
      // Just remove draft products
      setProducts(products.filter(p => p.id !== id));
    } else {
      // Mark existing products for deletion
      setProducts(products.map(p => (p.id === id ? { ...p, isDeleted: true } : p)));
    }
  };

  const moveProduct = (index: number, direction: "up" | "down") => {
    const newProducts = [...products];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newProducts.length) return;
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];
    setProducts(newProducts);
  };

  // Image upload handlers
  const handleHeroImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setHeroImage(file);
    const reader = new FileReader();
    reader.onload = () => setHeroImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setLogoImage(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProductImageSelect = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !farmId) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    // Upload immediately
    const fileExt = file.name.split(".").pop();
    const fileName = `${farmId}/${productId}-${Date.now()}.${fileExt}`;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "product-images");
      formData.append("path", fileName);

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
      updateProduct(productId, "image_url", data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  // Validation
  const validateStep = (step: Step): boolean => {
    setError(null);

    switch (step) {
      case 1:
        if (!farmName.trim()) {
          setError("Please enter your farm name");
          return false;
        }
        if (!farmSlug.trim()) {
          setError("Please enter a URL slug for your farm");
          return false;
        }
        if (!shortDescription.trim()) {
          setError("Please enter a short description");
          return false;
        }
        if (!contactEmail.trim()) {
          setError("Please enter a contact email");
          return false;
        }
        return true;

      case 2:
        if (!address.trim()) {
          setError("Please enter your farm address");
          return false;
        }
        if (!postcode.trim()) {
          setError("Please enter your postcode");
          return false;
        }
        if (deliveryDays.length === 0) {
          setError("Please select at least one delivery day");
          return false;
        }
        if (!postcodeRules.trim()) {
          setError("Please enter at least one delivery postcode area");
          return false;
        }
        return true;

      case 3:
        // Images are optional but encouraged
        return true;

      case 4:
        const visibleProducts = products.filter(p => !p.isDeleted);
        const validProducts = visibleProducts.filter(p => p.name.trim() && p.price.trim());
        if (validProducts.length < 1) {
          setError("Please add at least one product with a name and price");
          return false;
        }
        return true;

      case 5:
        return true;

      default:
        return true;
    }
  };

  // Save farm data (create or update)
  const saveFarmData = useCallback(async (isAutoSave = false): Promise<string | null> => {
    if (isAutoSave) {
      setIsSaving(true);
      setSaveStatus("saving");
    }

    try {
      const postcodeRulesArray = postcodeRules
        .split(/[,\n]/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      const farmData = {
        owner_user_id: userId,
        name: farmName.trim(),
        slug: farmSlug.trim().toLowerCase(),
        short_description: shortDescription.trim(),
        story: story.trim() || null,
        address: address.trim() || null,
        postcode: postcode.trim().toUpperCase() || null,
        postcode_rules: postcodeRulesArray.length > 0 ? postcodeRulesArray : null,
        delivery_days: deliveryDays.length > 0 ? deliveryDays : null,
        cutoff_time: cutoffTime || null,
        min_order_value: minOrderValue ? Math.round(parseFloat(minOrderValue) * 100) : null,
        delivery_fee: deliveryFee ? Math.round(parseFloat(deliveryFee) * 100) : null,
        hero_image_url: heroImageUrl || null,
        logo_url: logoUrl || null,
        contact_email: contactEmail.trim() || null,
        status: "pending" as const,
      };

      if (farmId) {
        // Update existing farm
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from("farms")
          .update(farmData)
          .eq("id", farmId);

        if (updateError) throw updateError;

        if (isAutoSave) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
        return farmId;
      } else {
        // Create new farm
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newFarm, error: insertError } = await (supabase as any)
          .from("farms")
          .insert(farmData)
          .select("id")
          .single();

        if (insertError) {
          if (insertError.message.includes("duplicate key") && insertError.message.includes("slug")) {
            // Try with a suffix
            const newSlug = `${farmSlug}-${Math.floor(Math.random() * 1000)}`;
            setFarmSlug(newSlug);
            throw new Error("This URL is already taken. We've suggested a new one. Please try again.");
          }
          throw insertError;
        }

        const newFarmId = (newFarm as { id: string }).id;
        setFarmId(newFarmId);

        if (isAutoSave) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
        return newFarmId;
      }
    } catch (err) {
      if (isAutoSave) {
        setSaveStatus("error");
      }
      throw err;
    } finally {
      if (isAutoSave) {
        setIsSaving(false);
      }
    }
  }, [
    userId, farmName, farmSlug, shortDescription, story, address, postcode,
    postcodeRules, deliveryDays, cutoffTime, minOrderValue, deliveryFee,
    heroImageUrl, logoUrl, contactEmail, farmId, supabase
  ]);

  // Upload images if needed
  const uploadImages = async (currentFarmId: string): Promise<{ heroUrl: string | null; logoUrl: string | null }> => {
    let newHeroUrl = heroImageUrl;
    let newLogoUrl = logoUrl;

    if (heroImage) {
      setIsUploadingHero(true);
      const fileExt = heroImage.name.split(".").pop();
      const fileName = `${currentFarmId}/${Date.now()}-hero.${fileExt}`;

      try {
        const formData = new FormData();
        formData.append("file", heroImage);
        formData.append("bucket", "farm-images");
        formData.append("path", fileName);

        const response = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newHeroUrl = data.url;
          setHeroImageUrl(data.url);
        }
      } finally {
        setIsUploadingHero(false);
      }
    }

    if (logoImage) {
      setIsUploadingLogo(true);
      const fileExt = logoImage.name.split(".").pop();
      const fileName = `${currentFarmId}/${Date.now()}-logo.${fileExt}`;

      try {
        const formData = new FormData();
        formData.append("file", logoImage);
        formData.append("bucket", "farm-images");
        formData.append("path", fileName);

        const response = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newLogoUrl = data.url;
          setLogoUrl(data.url);
        }
      } finally {
        setIsUploadingLogo(false);
      }
    }

    return { heroUrl: newHeroUrl, logoUrl: newLogoUrl };
  };

  // Save products
  const saveProducts = async (currentFarmId: string) => {
    const visibleProducts = products.filter(p => !p.isDeleted);

    // Delete removed products
    const deletedProducts = products.filter(p => p.isDeleted && !p.isNew);
    for (const product of deletedProducts) {
      await supabase.from("products").delete().eq("id", product.id);
    }

    // Save products
    for (let i = 0; i < visibleProducts.length; i++) {
      const product = visibleProducts[i];
      if (!product.name.trim() || !product.price.trim()) continue;

      const productData = {
        farm_id: currentFarmId,
        name: product.name.trim(),
        description: product.description.trim() || null,
        price: Math.round(parseFloat(product.price) * 100),
        unit_label: product.unit_label,
        weight_label: product.weight_label.trim() || null,
        stock_qty: product.stock_qty ? parseInt(product.stock_qty) : null,
        image_url: product.image_url || null,
        is_active: product.is_active,
        sort_order: i,
      };

      if (product.isNew) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("products").insert(productData);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("products").update(productData).eq("id", product.id);
      }
    }
  };

  // Navigation
  const goToNextStep = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Save on step 1 to get farm ID
      if (currentStep === 1) {
        await saveFarmData(false);
      }

      // Upload images on step 3
      if (currentStep === 3 && farmId) {
        const { heroUrl, logoUrl: newLogoUrl } = await uploadImages(farmId);
        
        // Update farm with new image URLs if they changed
        if (heroUrl !== heroImageUrl || newLogoUrl !== logoUrl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("farms")
            .update({
              hero_image_url: heroUrl,
              logo_url: newLogoUrl,
            })
            .eq("id", farmId);
        }
      }

      setCurrentStep((currentStep + 1) as Step);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // Final submit
  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !farmId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Save all products
      await saveProducts(farmId);

      // Final save of farm data
      await saveFarmData(false);

      // Redirect to dashboard with welcome message
      router.push("/farm-portal?submitted=true");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual save button
  const handleManualSave = async () => {
    if (!validateStep(currentStep)) return;

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const currentFarmId = await saveFarmData(false);
      if (currentFarmId && currentStep >= 3) {
        const { heroUrl, logoUrl: newLogoUrl } = await uploadImages(currentFarmId);
        if (heroUrl !== heroImageUrl || newLogoUrl !== logoUrl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("farms")
            .update({ hero_image_url: heroUrl, logo_url: newLogoUrl })
            .eq("id", currentFarmId);
        }
      }
      if (currentFarmId && currentStep >= 4) {
        await saveProducts(currentFarmId);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleProducts = products.filter(p => !p.isDeleted);
  const validProductCount = visibleProducts.filter(p => p.name.trim() && p.price.trim()).length;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700 mb-4">
            <Store className="h-4 w-4" />
            Farm Setup
          </div>
          <h1 className="font-display text-3xl font-bold">
            {existingFarm ? "Complete Your Farm Setup" : "Set Up Your Farm"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete these steps to start selling on FairFarm
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 px-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (s.step < currentStep) setCurrentStep(s.step as Step);
                }}
                disabled={s.step > currentStep}
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  s.step <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    currentStep === s.step
                      ? "border-amber-600 bg-amber-600 text-white"
                      : currentStep > s.step
                      ? "border-farm-600 bg-farm-600 text-white"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {currentStep > s.step ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  currentStep >= s.step ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s.title}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 sm:w-12 mx-1 sm:mx-2",
                    currentStep > s.step ? "bg-farm-600" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Basic Information</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell us about your farm
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Farm Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => handleFarmNameChange(e.target.value)}
                    placeholder="e.g., Green Valley Farm"
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    URL Slug <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">FairFarm.uk/farm/</span>
                    <input
                      type="text"
                      value={farmSlug}
                      onChange={(e) => setFarmSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="green-valley-farm"
                      disabled={!!existingFarm}
                      className="flex-1 h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {existingFarm && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      URL slug cannot be changed after creation
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Short Description <span className="text-red-500">*</span>
                    <span className="text-muted-foreground font-normal ml-1">(shown on cards)</span>
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="e.g., Family-run farm specializing in grass-fed beef"
                    maxLength={150}
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shortDescription.length}/150 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="orders@yourfarm.com"
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Where we&apos;ll send order notifications
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Farm Story <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="Tell customers about your farm, your practices, and what makes you special..."
                    rows={4}
                    className="w-full rounded-lg border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location & Delivery */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Location & Delivery</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Where is your farm and where do you deliver?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Farm Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Farm Lane, Countryside"
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    placeholder="e.g., SW1A 1AA"
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Delivery Area Postcodes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={postcodeRules}
                    onChange={(e) => setPostcodeRules(e.target.value)}
                    placeholder="SW1, SW2, W1, EC1 (comma or newline separated)"
                    rows={3}
                    className="w-full rounded-lg border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter postcode prefixes you deliver to, separated by commas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    Delivery Days <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERY_DAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setDeliveryDays(
                            deliveryDays.includes(day.value)
                              ? deliveryDays.filter(d => d !== day.value)
                              : [...deliveryDays, day.value]
                          );
                        }}
                        className={cn(
                          "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                          deliveryDays.includes(day.value)
                            ? "border-amber-600 bg-amber-50 text-amber-700"
                            : "border-input hover:border-amber-400"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Order Cutoff Time</label>
                  <select
                    value={cutoffTime}
                    onChange={(e) => setCutoffTime(e.target.value)}
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CUTOFF_TIMES.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Orders must be placed by this time the day before delivery
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimum Order Value (£)</label>
                    <input
                      type="number"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="20.00"
                      className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Delivery Fee (£)</label>
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="4.99"
                      className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Branding */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Branding</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Add images to make your farm stand out
                </p>
              </div>

              <div className="space-y-6">
                {/* Hero Image */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hero Image
                    <span className="text-muted-foreground font-normal ml-1">(displayed on your farm page)</span>
                  </label>
                  {heroImagePreview ? (
                    <div className="relative aspect-[2/1] rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={heroImagePreview}
                        alt="Hero preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHeroImage(null);
                          setHeroImagePreview(null);
                          setHeroImageUrl("");
                        }}
                        className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {isUploadingHero && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-[2/1] rounded-lg border-2 border-dashed cursor-pointer hover:border-amber-400 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload hero image</span>
                      <span className="text-xs text-muted-foreground mt-1">Recommended: 1200x600px. Max 5MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleHeroImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Logo
                    <span className="text-muted-foreground font-normal ml-1">(optional, square works best)</span>
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted shrink-0">
                      {logoPreview ? (
                        <>
                          <Image
                            src={logoPreview}
                            alt="Logo preview"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLogoImage(null);
                              setLogoPreview(null);
                              setLogoUrl("");
                            }}
                            className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {isUploadingLogo && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Store className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <label className="flex-1">
                      <div className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed px-4 py-3 hover:border-amber-400 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Upload logo</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {!heroImagePreview && !logoPreview && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm text-amber-700">
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      Images help your farm stand out. You can add them later in settings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Products */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Products</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Add at least one product to get started (you can add more later)
                </p>
              </div>

              {loadingProducts ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleProducts.map((product, index) => (
                    <div key={product.id} className="rounded-lg border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Product {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveProduct(index, "up")}
                            disabled={index === 0}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveProduct(index, "down")}
                            disabled={index === visibleProducts.length - 1}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          {visibleProducts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProduct(product.id)}
                              className="p-1 text-muted-foreground hover:text-destructive ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="flex items-start gap-4">
                        <div className="relative h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                          {product.image_url ? (
                            <>
                              <Image
                                src={product.image_url}
                                alt="Product"
                                fill
                                className="object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => updateProduct(product.id, "image_url", "")}
                                className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <label className="flex items-center justify-center h-full cursor-pointer hover:bg-muted/80">
                              <Package className="h-6 w-6 text-muted-foreground" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleProductImageSelect(product.id, e)}
                                disabled={!farmId}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                              placeholder="Product name *"
                              className="h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <div className="flex gap-2 items-center">
                              <span className="text-sm text-muted-foreground">£</span>
                              <input
                                type="number"
                                value={product.price}
                                onChange={(e) => updateProduct(product.id, "price", e.target.value)}
                                placeholder="Price *"
                                min="0"
                                step="0.01"
                                className="flex-1 h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={product.description}
                            onChange={(e) => updateProduct(product.id, "description", e.target.value)}
                            placeholder="Brief description (optional)"
                            className="w-full h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={product.unit_label}
                          onChange={(e) => updateProduct(product.id, "unit_label", e.target.value)}
                          className="h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="per pack">per pack</option>
                          <option value="per kg">per kg</option>
                          <option value="per item">per item</option>
                          <option value="each">each</option>
                        </select>
                        <input
                          type="text"
                          value={product.weight_label}
                          onChange={(e) => updateProduct(product.id, "weight_label", e.target.value)}
                          placeholder="Weight (e.g., 500g)"
                          className="h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="number"
                          value={product.stock_qty}
                          onChange={(e) => updateProduct(product.id, "stock_qty", e.target.value)}
                          placeholder="Stock"
                          min="0"
                          className="h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={product.is_active}
                          onChange={(e) => updateProduct(product.id, "is_active", e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Active (visible to customers)
                      </label>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addProduct}
                    className="w-full rounded-lg border border-dashed py-3 text-sm font-medium text-muted-foreground hover:border-amber-400 hover:text-amber-600 transition-colors"
                  >
                    <Plus className="inline h-4 w-4 mr-2" />
                    Add Another Product
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Review & Submit</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Review your farm details before submitting for approval
                </p>
              </div>

              <div className="space-y-4">
                {/* Farm Info Summary */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4 text-amber-600" />
                    Farm Details
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{farmName}</dd>
                    <dt className="text-muted-foreground">URL</dt>
                    <dd className="font-medium">FairFarm.uk/farm/{farmSlug}</dd>
                    <dt className="text-muted-foreground">Description</dt>
                    <dd className="font-medium col-span-2 mt-1">{shortDescription}</dd>
                  </dl>
                </div>

                {/* Delivery Summary */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-amber-600" />
                    Delivery Settings
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Location</dt>
                    <dd className="font-medium">{postcode}</dd>
                    <dt className="text-muted-foreground">Delivery Areas</dt>
                    <dd className="font-medium">{postcodeRules}</dd>
                    <dt className="text-muted-foreground">Delivery Days</dt>
                    <dd className="font-medium">{deliveryDays.join(", ") || "None selected"}</dd>
                    <dt className="text-muted-foreground">Cutoff Time</dt>
                    <dd className="font-medium">{cutoffTime}</dd>
                    <dt className="text-muted-foreground">Min Order</dt>
                    <dd className="font-medium">£{minOrderValue}</dd>
                    <dt className="text-muted-foreground">Delivery Fee</dt>
                    <dd className="font-medium">£{deliveryFee}</dd>
                  </dl>
                </div>

                {/* Branding Summary */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-amber-600" />
                    Branding
                  </h3>
                  <div className="flex gap-4">
                    {heroImagePreview ? (
                      <div className="relative h-16 w-32 rounded bg-muted overflow-hidden">
                        <Image src={heroImagePreview} alt="Hero" fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-16 w-32 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No hero image
                      </div>
                    )}
                    {logoPreview ? (
                      <div className="relative h-16 w-16 rounded bg-muted overflow-hidden">
                        <Image src={logoPreview} alt="Logo" fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No logo
                      </div>
                    )}
                  </div>
                </div>

                {/* Products Summary */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    Products
                  </h3>
                  <p className="text-sm">
                    <span className="font-medium">{validProductCount}</span> product{validProductCount !== 1 ? "s" : ""} ready
                  </p>
                  {validProductCount > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {visibleProducts
                        .filter(p => p.name.trim() && p.price.trim())
                        .slice(0, 5)
                        .map(p => (
                          <li key={p.id}>• {p.name} - £{p.price}</li>
                        ))}
                      {validProductCount > 5 && (
                        <li>• ... and {validProductCount - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>

                {/* What Happens Next */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <h3 className="font-medium text-amber-800 mb-2">What happens next?</h3>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Your farm will be submitted for review</li>
                    <li>• Our team will review your application within 24-48 hours</li>
                    <li>• Once approved, your farm will appear on the marketplace</li>
                    <li>• You can continue editing while waiting for approval</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep === 1 || isSubmitting}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  currentStep === 1
                    ? "invisible"
                    : "hover:bg-muted"
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Save button */}
              {currentStep > 1 && currentStep < 5 && (
                <button
                  type="button"
                  onClick={handleManualSave}
                  disabled={isSaving || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  {saveStatus === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saveStatus === "saved" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saveStatus === "saved" ? "Saved" : "Save Progress"}
                </button>
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-farm-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-farm-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Submit for Approval
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
