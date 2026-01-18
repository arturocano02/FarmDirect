import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "@/lib/utils/date";
import { 
  ArrowRight, 
  Inbox, 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  AlertTriangle,
  MapPin,
  Calendar
} from "lucide-react";

export const metadata = {
  title: "Orders | Farm Portal",
  description: "View and manage your farm orders",
};

// Order status display config
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  processing: { label: "New", color: "text-blue-700", bgColor: "bg-blue-100 border-blue-200", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-green-700", bgColor: "bg-green-100 border-green-200", icon: CheckCircle },
  preparing: { label: "Preparing", color: "text-amber-700", bgColor: "bg-amber-100 border-amber-200", icon: Package },
  ready_for_pickup: { label: "Ready", color: "text-purple-700", bgColor: "bg-purple-100 border-purple-200", icon: Package },
  out_for_delivery: { label: "Delivering", color: "text-indigo-700", bgColor: "bg-indigo-100 border-indigo-200", icon: Truck },
  delivered: { label: "Delivered", color: "text-emerald-700", bgColor: "bg-emerald-100 border-emerald-200", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-100 border-red-200", icon: AlertTriangle },
  exception: { label: "Issue", color: "text-red-700", bgColor: "bg-red-100 border-red-200", icon: AlertTriangle },
};

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string;
  delivery_postcode: string | null;
  requested_delivery_date: string | null;
  customer: {
    name: string | null;
  } | null;
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function FarmOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirectTo=/farm-portal/orders");
  }

  // Get the user's farm
  const { data: farmData, error: farmError } = await supabase
    .from("farms")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .single();

  if (farmError || !farmData) {
    redirect("/farm-portal/setup");
  }

  const farm = farmData as { id: string; name: string };

  // Fetch farm's orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersData, error } = await (supabase as any)
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      total,
      created_at,
      delivery_address,
      delivery_postcode,
      requested_delivery_date,
      customer:profiles!customer_user_id(name)
    `)
    .eq("farm_id", farm.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[farm-orders] Error fetching orders:", error);
  }

  const allOrders = (ordersData || []) as unknown as Order[];

  // Filter by status if provided
  const filteredOrders = params.status 
    ? allOrders.filter(o => o.status === params.status)
    : allOrders;

  // Count orders by status
  const statusCounts: Record<string, number> = {};
  allOrders.forEach(order => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  // Group orders for sections
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const newToday = filteredOrders.filter(o => {
    const orderDate = new Date(o.created_at);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.toISOString() === todayStr && o.status === "processing";
  });

  const needsAction = filteredOrders.filter(o => 
    ["processing", "confirmed", "preparing"].includes(o.status)
  );

  const dueSoon = filteredOrders.filter(o => {
    if (!o.requested_delivery_date) return false;
    const deliveryDate = new Date(o.requested_delivery_date);
    const daysDiff = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 2 && daysDiff >= 0 && !["delivered", "cancelled"].includes(o.status);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and manage customer orders for {farm.name}
        </p>
      </div>

      {/* Alert banners */}
      {newToday.length > 0 && !params.status && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">
              {newToday.length} new order{newToday.length !== 1 ? "s" : ""} today!
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Review and confirm these orders to keep your customers happy.
            </p>
          </div>
        </div>
      )}

      {dueSoon.length > 0 && !params.status && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              {dueSoon.length} order{dueSoon.length !== 1 ? "s" : ""} due in next 2 days
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Make sure you&apos;re prepared for upcoming deliveries.
            </p>
          </div>
        </div>
      )}

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/farm-portal/orders"
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            !params.status
              ? "border-farm-600 bg-farm-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Orders
          <span className={`rounded-full px-2 py-0.5 text-xs ${!params.status ? "bg-white/20" : "bg-slate-100"}`}>
            {allOrders.length}
          </span>
        </Link>
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = statusCounts[key] || 0;
          if (count === 0 && !["processing", "confirmed", "preparing", "delivered"].includes(key)) {
            return null;
          }
          const isActive = params.status === key;
          const Icon = config.icon;
          return (
            <Link
              key={key}
              href={`/farm-portal/orders?status=${key}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-farm-600 bg-farm-600 text-white"
                  : `${config.bgColor} ${config.color} hover:opacity-80`
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/20" : "bg-white/50"}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Needs Attention" 
          value={needsAction.length} 
          highlight={needsAction.length > 0}
          icon={AlertTriangle}
        />
        <StatCard 
          label="Preparing" 
          value={statusCounts["preparing"] || 0}
          icon={Package}
        />
        <StatCard 
          label="Out for Delivery" 
          value={statusCounts["out_for_delivery"] || 0}
          icon={Truck}
        />
        <StatCard 
          label="Delivered" 
          value={statusCounts["delivered"] || 0}
          icon={CheckCircle}
        />
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <EmptyOrders hasFilter={!!params.status} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Order
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Delivery
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.status] || { label: order.status, color: "text-slate-700", bgColor: "bg-slate-100 border-slate-200", icon: Package };
                  const Icon = status.icon;
                  const isNew = new Date(order.created_at) > new Date(Date.now() - 2 * 60 * 60 * 1000); // Within 2 hours
                  
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{order.order_number}</p>
                          {isNew && (
                            <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900">
                          {order.customer?.name || "Customer"}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">
                            {order.delivery_postcode || order.delivery_address.split("\n")[0]}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${status.bgColor} ${status.color}`}>
                          <Icon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {order.requested_delivery_date ? (
                          <div className="text-sm">
                            <p className="text-slate-900">
                              {new Date(order.requested_delivery_date).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Not specified</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          £{(order.total / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(order.created_at))} ago
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/farm-portal/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-farm-600 hover:text-farm-800 transition-colors"
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  highlight = false,
  icon: Icon
}: { 
  label: string; 
  value: number; 
  highlight?: boolean;
  icon: typeof Clock;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-600" : "text-slate-400"}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight ? "text-amber-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyOrders({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <Inbox className="mx-auto h-12 w-12 text-slate-300" />
      <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
        {hasFilter ? "No matching orders" : "No orders yet"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {hasFilter 
          ? "Try adjusting your filter to see more orders."
          : "Orders will appear here when customers place them."}
      </p>
      {hasFilter && (
        <Link
          href="/farm-portal/orders"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-farm-600 hover:text-farm-800"
        >
          View all orders
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
