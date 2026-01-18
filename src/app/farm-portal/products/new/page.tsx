import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "../product-form";

export const metadata = {
  title: "Add Product",
  description: "Add a new product to your farm",
};

export default async function NewProductPage() {
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
        <h1 className="section-heading">Add Product</h1>
        <p className="mt-2 text-muted-foreground">
          Create a new product listing
        </p>
      </div>

      <ProductForm farmId={farm.id} />
    </div>
  );
}
