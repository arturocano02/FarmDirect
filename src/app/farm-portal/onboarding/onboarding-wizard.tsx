"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Store,
  MapPin,
  Truck,
  Package,
  ImageIcon,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  X,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FarmOnboardingWizardProps {
  userId: string;
  userEmail: string;
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
}

const STEPS = [
  { step: 1, title: "Farm Details", icon: Store },
  { step: 2, title: "Location", icon: MapPin },
  { step: 3, title: "Delivery", icon: Truck },
  { step: 4, title: "Products", icon: Package },
  { step: 5, title: "Finish", icon: ImageIcon },
] as const;

const DELIVERY_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
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

export function FarmOnboardingWizard({ userId, userEmail }: FarmOnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Farm Details
  const [farmName, setFarmName] = useState("");
  const [farmSlug, setFarmSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [story, setStory] = useState("");

  // Step 2: Location
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [deliveryPostcodes, setDeliveryPostcodes] = useState("");

  // Step 3: Delivery Settings
  const [deliveryDays, setDeliveryDays] = useState<string[]>([]);
  const [cutoffTime, setCutoffTime] = useState("18:00");
  const [minOrderValue, setMinOrderValue] = useState("20");
  const [deliveryFee, setDeliveryFee] = useState("4.99");

  // Step 4: Products
  const [products, setProducts] = useState<ProductDraft[]>([
    { id: generateProductId(), name: "", description: "", price: "", unit_label: "per pack", weight_label: "", stock_qty: "" },
  ]);

  // Step 5: Images
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);

  // Auto-generate slug from farm name
  const handleFarmNameChange = (name: string) => {
    setFarmName(name);
    setFarmSlug(generateSlug(name));
  };

  // Handle product changes
  const updateProduct = (id: string, field: keyof ProductDraft, value: string) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const addProduct = () => {
    setProducts([
      ...products,
      { id: generateProductId(), name: "", description: "", price: "", unit_label: "per pack", weight_label: "", stock_qty: "" },
    ]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // Handle image upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setHeroImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
        return true;

      case 3:
        if (deliveryDays.length === 0) {
          setError("Please select at least one delivery day");
          return false;
        }
        return true;

      case 4:
        const validProducts = products.filter(p => p.name.trim() && p.price.trim());
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

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // Submit the entire form
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Upload hero image if provided
      let heroImageUrl: string | null = null;
      if (heroImage) {
        const fileExt = heroImage.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("farm-images")
          .upload(fileName, heroImage);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("farm-images")
            .getPublicUrl(fileName);
          heroImageUrl = publicUrl;
        }
      }

      // 2. Create the farm
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: farm, error: farmError } = await (supabase as any)
        .from("farms")
        .insert({
          owner_user_id: userId,
          name: farmName.trim(),
          slug: farmSlug.trim().toLowerCase(),
          short_description: shortDescription.trim(),
          story: story.trim() || null,
          address: address.trim(),
          postcode: postcode.trim().toUpperCase(),
          postcode_rules: deliveryPostcodes.trim() || null,
          delivery_days: deliveryDays,
          cutoff_time: cutoffTime,
          min_order_value: Math.round(parseFloat(minOrderValue) * 100),
          delivery_fee: Math.round(parseFloat(deliveryFee) * 100),
          hero_image_url: heroImageUrl,
          status: "pending",
          contact_email: userEmail,
        })
        .select("id")
        .single();

      if (farmError) {
        if (farmError.message.includes("duplicate key") && farmError.message.includes("slug")) {
          setError("This farm URL is already taken. Please choose a different one.");
        } else {
          setError(farmError.message);
        }
        return;
      }

      // 3. Create products
      const validProducts = products.filter(p => p.name.trim() && p.price.trim());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const farmData = farm as any;
      if (validProducts.length > 0 && farmData) {
        const productInserts = validProducts.map((p, index) => ({
          farm_id: farmData.id,
          name: p.name.trim(),
          description: p.description.trim() || null,
          price: Math.round(parseFloat(p.price) * 100),
          unit_label: p.unit_label || "per pack",
          weight_label: p.weight_label.trim() || null,
          stock_qty: p.stock_qty ? parseInt(p.stock_qty) : null,
          is_active: true,
          sort_order: index,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: productsError } = await (supabase as any)
          .from("products")
          .insert(productInserts);

        if (productsError) {
          console.error("Error creating products:", productsError);
          // Continue anyway - farm is created
        }
      }

      // Success! Redirect to farm portal
      router.push("/farm-portal?welcome=true");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700 mb-4">
            <Store className="h-4 w-4" />
            Farm Setup
          </div>
          <h1 className="font-display text-3xl font-bold">Set up your farm</h1>
          <p className="mt-2 text-muted-foreground">
            Complete these steps to start selling on FairFarm
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 px-4">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center">
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
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "hidden sm:block h-0.5 w-12 mx-2",
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
          {/* Step 1: Farm Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Farm Details</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell us about your farm
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Farm Name *
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
                    URL Slug *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">FairFarm.uk/farm/</span>
                    <input
                      type="text"
                      value={farmSlug}
                      onChange={(e) => setFarmSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="green-valley-farm"
                      className="flex-1 h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Short Description * <span className="text-muted-foreground font-normal">(shown on cards)</span>
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="e.g., Family-run farm specializing in grass-fed beef"
                    maxLength={120}
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shortDescription.length}/120 characters
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

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Location</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Where is your farm located?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Farm Address *
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Farm address"
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Postcode *
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
                    Delivery Area Postcodes <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={deliveryPostcodes}
                    onChange={(e) => setDeliveryPostcodes(e.target.value)}
                    placeholder="e.g., SW1, SW2, W1, EC1 (comma or newline separated)"
                    rows={3}
                    className="w-full rounded-lg border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leave blank to deliver anywhere, or list postcode prefixes you deliver to
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Delivery Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Delivery Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure how you deliver to customers
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Delivery Days *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
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
                  <label className="block text-sm font-medium mb-2">
                    Order Cutoff Time
                  </label>
                  <select
                    value={cutoffTime}
                    onChange={(e) => setCutoffTime(e.target.value)}
                    className="w-full h-11 rounded-lg border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="12:00">12:00 PM (noon)</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="20:00">8:00 PM</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Orders must be placed by this time the day before delivery
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Minimum Order Value (£)
                    </label>
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
                    <label className="block text-sm font-medium mb-2">
                      Delivery Fee (£)
                    </label>
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

          {/* Step 4: Products */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Add Products</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Add at least one product to get started (you can add more later)
                </p>
              </div>

              <div className="space-y-4">
                {products.map((product, index) => (
                  <div key={product.id} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Product {index + 1}</span>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                          placeholder="Product name *"
                          className="w-full h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <span className="flex items-center text-sm text-muted-foreground">£</span>
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

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={product.unit_label}
                        onChange={(e) => updateProduct(product.id, "unit_label", e.target.value)}
                        placeholder="Unit (e.g., per pack)"
                        className="h-10 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
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
            </div>
          )}

          {/* Step 5: Images & Finish */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold">Almost Done!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a hero image for your farm page (optional)
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Farm Hero Image <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  {heroImagePreview ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
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
                        }}
                        className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed cursor-pointer hover:border-amber-400 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload image</span>
                      <span className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <h3 className="font-medium text-amber-800 mb-2">What happens next?</h3>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Your farm will be submitted for review</li>
                    <li>• Our team will review your application within 24-48 hours</li>
                    <li>• Once approved, your farm will appear on the marketplace</li>
                    <li>• You can continue setting up products while waiting</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
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

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
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
                    Creating Farm...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create My Farm
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
