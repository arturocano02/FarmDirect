import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "@/lib/utils/date";
import { 
  Search, 
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { FarmFilterSelect } from "./orders-filters-client";

export const metadata = {
  title: "Orders",
};

export const dynamic = "force-dynamic";

const ORDER_STATUSES = [
  { value: "processing", label: "Processing", icon: Clock, color: "amber" },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle, color: "blue" },
  { value: "preparing", label: "Preparing", icon: Package, color: "indigo" },
  { value: "ready_for_pickup", label: "Ready", icon: Package, color: "purple" },
  { value: "out_for_delivery", label: "Delivering", icon: Truck, color: "cyan" },
  { value: "delivered", label: "Delivered", icon: CheckCircle, color: "green" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "red" },
  { value: "exception", label: "Exception", icon: AlertTriangle, color: "orange" },
] as const;

interface PageProps {
  searchParams: Promise<{ status?: string; farm?: string; search?: string; range?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Dev-only logging
  if (process.env.NODE_ENV === "development") {
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[admin/orders] Fetching orders for user:", user?.id ?? "anon");
  }

  // Calculate date ranges
  const now = new Date();
  const ranges: Record<string, Date> = {
    today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  };

  // Build query - use left joins (no !inner) to avoid empty results when profiles/farms are missing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      payment_status,
      total,
      delivery_address,
      delivery_postcode,
      created_at,
      farm_id,
      customer_user_id,
      farms(id, name, slug),
      profiles(id, name)
    `)
    .order("created_at", { ascending: false });

  // Apply status filter
  if (params.status && ORDER_STATUSES.map(s => s.value).includes(params.status as typeof ORDER_STATUSES[number]["value"])) {
    query = query.eq("status", params.status);
  }

  // Apply farm filter
  if (params.farm) {
    query = query.eq("farm_id", params.farm);
  }

  // Apply date range filter
  if (params.range && ranges[params.range]) {
    query = query.gte("created_at", ranges[params.range].toISOString());
  }

  const { data: ordersData, error } = await query.limit(200);

  if (error) {
    console.error("[admin/orders] Error fetching orders:", error);
    if (process.env.NODE_ENV === "development") {
      console.error("[admin/orders] Error details:", JSON.stringify(error, null, 2));
    }
  }

  // Type with nullable joins for safety
  const orders = (ordersData || []) as Array<{
    id: string;
    order_number: string;
    status: string;
    payment_status: string | null;
    total: number;
    delivery_address: string;
    delivery_postcode: string | null;
    created_at: string;
    farm_id: string;
    customer_user_id: string;
    farms: { id: string; name: string; slug: string } | null;
    profiles: { id: string; name: string | null } | null;
  }>;

  // Apply search filter (client-side for now)
  let filteredOrders = orders;
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filteredOrders = orders.filter(order =>
      order.order_number.toLowerCase().includes(searchLower) ||
      (order.profiles?.name?.toLowerCase().includes(searchLower)) ||
      (order.farms?.name?.toLowerCase().includes(searchLower)) ||
      (order.delivery_postcode?.toLowerCase().includes(searchLower))
    );
  }

  // Fetch farms for filter dropdown
  const { data: farmsData } = await supabase
    .from("farms")
    .select("id, name")
    .order("name");
  
  const farms = (farmsData || []) as Array<{ id: string; name: string }>;

  // Get status counts for all orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allOrders } = await (supabase as any)
    .from("orders")
    .select("status");
  
  const statusCounts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (allOrders || []).forEach((order: any) => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700 border-green-200";
      case "cancelled":
      case "exception":
        return "bg-red-100 text-red-700 border-red-200";
      case "processing":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "confirmed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "preparing":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "out_for_delivery":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPaymentBadgeClass = (status: string | null) => {
    switch (status) {
      case "paid":
        return "bg-green-50 text-green-600";
      case "pending":
        return "bg-amber-50 text-amber-600";
      case "failed":
        return "bg-red-50 text-red-600";
      default:
        return "bg-slate-50 text-slate-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage and monitor all platform orders
        </p>
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <form method="GET" className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Search orders, customers, farms..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {/* Preserve other params */}
            {params.status && <input type="hidden" name="status" value={params.status} />}
            {params.farm && <input type="hidden" name="farm" value={params.farm} />}
            {params.range && <input type="hidden" name="range" value={params.range} />}
          </form>

          {/* Quick filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date range chips */}
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { key: "", label: "All" },
                { key: "today", label: "Today" },
                { key: "7d", label: "7 days" },
                { key: "30d", label: "30 days" },
              ].map((range) => (
                <Link
                  key={range.key}
                  href={`/admin/orders?${new URLSearchParams({
                    ...(params.status && { status: params.status }),
                    ...(params.farm && { farm: params.farm }),
                    ...(params.search && { search: params.search }),
                    ...(range.key && { range: range.key }),
                  }).toString()}`}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    (params.range || "") === range.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {range.label}
                </Link>
              ))}
            </div>

            {/* Farm dropdown - client component for interactivity */}
            <FarmFilterSelect 
              farms={farms} 
              currentFarmId={params.farm} 
            />
          </div>
        </div>

        {/* Status filter chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/admin/orders?${new URLSearchParams({
              ...(params.farm && { farm: params.farm }),
              ...(params.search && { search: params.search }),
              ...(params.range && { range: params.range }),
            }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !params.status
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All
            <span className="rounded-full bg-white/20 px-1.5 py-0.5">
              {totalOrders}
            </span>
          </Link>
          {ORDER_STATUSES.slice(0, 6).map((status) => {
            const isActive = params.status === status.value;
            const count = statusCounts[status.value] || 0;
            return (
              <Link
                key={status.value}
                href={`/admin/orders?${new URLSearchParams({
                  status: status.value,
                  ...(params.farm && { farm: params.farm }),
                  ...(params.search && { search: params.search }),
                  ...(params.range && { range: params.range }),
                }).toString()}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {status.label}
                <span className={`rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : "bg-slate-100"}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">{filteredOrders.length}</span> orders
          {params.search && (
            <> matching &quot;<span className="font-medium text-slate-900">{params.search}</span>&quot;</>
          )}
        </p>
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Order
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Farm
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Payment
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Postcode
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-900">No orders found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try adjusting your filters or search term
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {order.profiles?.name || "Guest"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {order.farms ? (
                        <Link 
                          href={`/admin/farms/${order.farms.id}`}
                          className="text-sm text-slate-600 hover:text-orange-600"
                        >
                          {order.farms.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-400">Unknown Farm</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadgeClass(order.status)}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${getPaymentBadgeClass(order.payment_status)}`}>
                        {order.payment_status || "n/a"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        £{(order.total / 100).toFixed(2)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-xs font-mono text-slate-500">
                        {order.delivery_postcode || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(order.created_at))} ago
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
