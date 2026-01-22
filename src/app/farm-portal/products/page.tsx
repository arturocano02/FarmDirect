import Link from "next/link";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Plus, Package, Pencil } from "lucide-react";
import { getProductFallbackImage } from "@/lib/utils/image-fallbacks";

export const metadata = {
  title: "Products",
  description: "Manage your farm products",
};

export const dynamic = "force-dynamic";

export default async function FarmProductsPage() {
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

  // Fetch products
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: productsData } = await (supabase as any)
    .from("products")
    .select("*")
    .eq("farm_id", farm.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const products = (productsData || []) as Array<{
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    price: number;
    unit_label: string;
    weight_label: string | null;
    stock_qty: number | null;
    is_active: boolean;
    sort_order: number;
  }>;

  const activeCount = products.filter(p => p.is_active).length;
  const inactiveCount = products.filter(p => !p.is_active).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-heading">Products</h1>
          <p className="mt-2 text-muted-foreground">
            {products.length} products ({activeCount} active, {inactiveCount} inactive)
          </p>
        </div>
        <Link
          href="/farm-portal/products/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Products grid */}
      {products.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No products yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first product to start selling
          </p>
          <Link
            href="/farm-portal/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-xl border bg-card overflow-hidden group">
              {/* Product Image */}
              <div className="relative aspect-square bg-muted">
                <ImageWithFallback
                  src={product.image_url}
                  fallbackSrc={getProductFallbackImage(product.name)}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                
                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {product.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Stock badge */}
                {product.stock_qty !== null && product.stock_qty <= 5 && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {product.stock_qty === 0 ? "Out of stock" : `Low: ${product.stock_qty}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.weight_label} · {product.unit_label}
                    </p>
                  </div>
                  <p className="font-semibold text-farm-700">
                    £{(product.price / 100).toFixed(2)}
                  </p>
                </div>

                {product.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/farm-portal/products/${product.id}/edit`}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/80"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
