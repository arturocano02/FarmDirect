import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "../../product-form";
import type { Product } from "@/types/database";

export const metadata = {
  title: "Edit Product",
  description: "Edit your product",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's farm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: farmData } = await (supabase as any)
    .from("farms")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!farmData) {
    redirect("/farm-portal/setup");
  }
  
  const farm = farmData as { id: string };

  // Fetch product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product, error } = await (supabase as any)
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("farm_id", farm.id)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/farm-portal/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <h1 className="section-heading">Edit Product</h1>
        <p className="mt-2 text-muted-foreground">
          Update your product details
        </p>
      </div>

      <ProductForm product={product as Product} farmId={farm.id} />
    </div>
  );
}
