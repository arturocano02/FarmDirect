import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "@/lib/utils/date";
import { Package, ArrowRight, ShoppingBag } from "lucide-react";

export const metadata = {
  title: "My Orders | FairFarm",
  description: "View your order history",
};

// Order status display config
const statusConfig: Record<string, { label: string; color: string }> = {
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800" },
  preparing: { label: "Preparing", color: "bg-amber-100 text-amber-800" },
  ready_for_pickup: { label: "Ready", color: "bg-purple-100 text-purple-800" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
  exception: { label: "Issue", color: "bg-red-100 text-red-800" },
};

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  farm: {
    name: string;
    slug: string;
  } | null;
}

export default async function OrdersPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirectTo=/orders");
  }

  // Fetch customer's orders
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      total,
      created_at,
      farm:farms(name, slug)
    `)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[orders] Error fetching orders:", error);
  }

  const typedOrders = (orders || []) as unknown as Order[];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="section-heading mb-8">My Orders</h1>

      {typedOrders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="space-y-4">
          {typedOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800" };

  return (
    <Link
      href={`/order/${order.id}`}
      className="block rounded-xl border bg-card p-6 hover:border-farm-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-farm-100 text-farm-700">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display font-semibold">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">
              {order.farm?.name || "Unknown Farm"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(order.created_at)}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
          <p className="font-semibold">£{(order.total / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end text-sm text-farm-600">
        <span>View details</span>
        <ArrowRight className="ml-1 h-4 w-4" />
      </div>
    </Link>
  );
}

function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="font-display text-xl font-semibold mb-2">No orders yet</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Once you place an order, it will appear here. Browse our farms to find premium quality meat.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Browse Farms
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
