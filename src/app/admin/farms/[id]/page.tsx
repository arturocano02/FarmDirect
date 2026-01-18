import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "@/lib/utils/date";
import { 
  ArrowLeft,
  Store,
  MapPin,
  Mail,
  ExternalLink,
  Package,
  ShoppingBag,
  Clock,
  Truck
} from "lucide-react";
import { FarmStatusActions } from "./farm-status-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: farm } = await (supabase as any)
    .from("farms")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: (farm as { name: string } | null)?.name || "Farm Details",
  };
}

export const dynamic = "force-dynamic";

export default async function AdminFarmDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch farm with related data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: farm, error } = await (supabase as any)
    .from("farms")
    .select(`
      *,
      profiles!inner(id, name)
    `)
    .eq("id", id)
    .single();

  if (error || !farm) {
    console.error("[admin/farms/[id]] Error:", error);
    notFound();
  }

  // Fetch farm products count
  const { count: productsCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", id)
    .eq("is_active", true);

  // Fetch farm orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders, count: ordersCount } = await (supabase as any)
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      total,
      created_at
    `, { count: "exact" })
    .eq("farm_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch products
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: productsData } = await (supabase as any)
    .from("products")
    .select("id, name, price, is_active, stock_qty")
    .eq("farm_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const products = productsData as Array<{
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    stock_qty: number | null;
  }> | null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "suspended":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "processing":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/farms"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {farm.name}
            </h1>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${getStatusBadge(farm.status)}`}>
              {farm.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Registered {formatDistanceToNow(new Date(farm.created_at))} ago
          </p>
        </div>
        {farm.status === "approved" && (
          <Link
            href={`/farm/${farm.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View Public Page
          </Link>
        )}
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Farm details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Farm Info Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Hero image */}
            <div className="relative h-48 bg-slate-100">
              {farm.hero_image_url ? (
                <Image
                  src={farm.hero_image_url}
                  alt={farm.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Store className="h-16 w-16 text-slate-300" />
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-500">About</h3>
                <p className="mt-1 text-slate-900">
                  {farm.short_description || "No description provided."}
                </p>
                {farm.story && (
                  <p className="mt-3 text-sm text-slate-600">
                    {farm.story}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Location</p>
                    <p className="text-sm text-slate-600">{farm.address || "Not provided"}</p>
                    <p className="text-sm font-mono text-slate-500">{farm.postcode || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Contact Email</p>
                    <a 
                      href={`mailto:${farm.contact_email}`}
                      className="text-sm text-orange-600 hover:underline"
                    >
                      {farm.contact_email || "Not provided"}
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Delivery Days</p>
                    <p className="text-sm text-slate-600">
                      {farm.delivery_days?.join(", ") || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Cutoff Time</p>
                    <p className="text-sm text-slate-600">
                      {farm.cutoff_time || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-900">Minimum Order</p>
                  <p className="text-sm text-slate-600">
                    {farm.min_order_value ? `£${(farm.min_order_value / 100).toFixed(2)}` : "No minimum"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Delivery Fee</p>
                  <p className="text-sm text-slate-600">
                    {farm.delivery_fee ? `£${(farm.delivery_fee / 100).toFixed(2)}` : "Free"}
                  </p>
                </div>
              </div>

              {farm.postcode_rules && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-900">Delivery Postcodes</p>
                  <p className="text-sm font-mono text-slate-600 mt-1">
                    {farm.postcode_rules}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                Products ({productsCount || 0})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {!products || products.length === 0 ? (
                <div className="p-5 text-center text-sm text-slate-500">
                  No products listed
                </div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">
                        Stock: {product.stock_qty ?? "Unlimited"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        £{(product.price / 100).toFixed(2)}
                      </p>
                      <span className={`text-xs ${product.is_active ? "text-green-600" : "text-slate-400"}`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-slate-500" />
                Recent Orders ({ordersCount || 0})
              </h2>
              <Link 
                href={`/admin/orders?farm=${farm.id}`}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {!orders || orders.length === 0 ? (
                <div className="p-5 text-center text-sm text-slate-500">
                  No orders yet
                </div>
              ) : (
                orders.map((order: { id: string; order_number: string; status: string; total: number; created_at: string }) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(order.created_at))} ago
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        £{(order.total / 100).toFixed(2)}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getOrderStatusBadge(order.status)}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Actions & Owner Info */}
        <div className="space-y-6">
          {/* Status Actions */}
          <FarmStatusActions farmId={farm.id} currentStatus={farm.status} />

          {/* Owner Info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900">Farm Owner</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-medium text-slate-900">
                {farm.profiles?.name || "Unknown"}
              </p>
              <Link
                href={`/admin/users?search=${farm.profiles?.id}`}
                className="text-sm text-orange-600 hover:underline"
              >
                View user profile →
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-medium text-slate-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Products</span>
                <span className="text-sm font-semibold text-slate-900">{productsCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Orders</span>
                <span className="text-sm font-semibold text-slate-900">{ordersCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Farm URL</span>
                <span className="text-sm font-mono text-slate-500">/{farm.slug}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
