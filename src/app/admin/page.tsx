import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { 
  ShoppingBag, 
  Store, 
  Clock, 
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Package,
  Mail
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/date";

export const metadata = {
  title: "Overview",
  description: "FairFarm admin console overview",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Calculate date ranges
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch comprehensive stats
  const [
    // Order stats
    totalOrdersResult,
    orders7dResult,
    orders30dResult,
    processingOrdersResult,
    confirmedOrdersResult,
    deliveredOrdersResult,
    cancelledOrdersResult,
    revenue30dResult,
    // Farm stats
    approvedFarmsResult,
    pendingFarmsResult,
    suspendedFarmsResult,
    // User stats
    totalUsersResult,
    newUsers7dResult,
    // Recent activity
    recentOrdersResult,
    pendingApprovalsResult,
    recentOrderEventsResult,
    // Email stats (if table exists)
    emailOutboxResult,
  ] = await Promise.all([
    // Orders
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    supabase.from("orders").select("total").gte("created_at", thirtyDaysAgo),
    // Farms
    supabase.from("farms").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("farms").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("farms").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    // Users
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    // Recent activity
    supabase.from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        created_at,
        farms!inner(name)
      `)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("farms")
      .select("id, name, slug, created_at, contact_email")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("order_events")
      .select(`
        id,
        event_type,
        created_at,
        note,
        orders!inner(order_number)
      `)
      .order("created_at", { ascending: false })
      .limit(10),
    // Emails
    supabase.from("email_outbox")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Calculate revenue (sum of totals from orders in last 30 days)
  const revenue30d = revenue30dResult.data?.reduce((sum, order) => sum + ((order as { total: number }).total || 0), 0) || 0;

  const stats = {
    totalOrders: totalOrdersResult.count || 0,
    orders7d: orders7dResult.count || 0,
    orders30d: orders30dResult.count || 0,
    processingOrders: processingOrdersResult.count || 0,
    confirmedOrders: confirmedOrdersResult.count || 0,
    deliveredOrders: deliveredOrdersResult.count || 0,
    cancelledOrders: cancelledOrdersResult.count || 0,
    revenue30d,
    approvedFarms: approvedFarmsResult.count || 0,
    pendingFarms: pendingFarmsResult.count || 0,
    suspendedFarms: suspendedFarmsResult.count || 0,
    totalUsers: totalUsersResult.count || 0,
    newUsers7d: newUsers7dResult.count || 0,
  };

  const recentOrders = (recentOrdersResult.data || []) as Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
    farms: { name: string };
  }>;

  const pendingApprovals = (pendingApprovalsResult.data || []) as Array<{
    id: string;
    name: string;
    slug: string;
    created_at: string;
    contact_email: string | null;
  }>;

  const recentEvents = (recentOrderEventsResult.data || []) as Array<{
    id: string;
    event_type: string;
    created_at: string;
    note: string | null;
    orders: { order_number: string };
  }>;

  const emails = (emailOutboxResult.data || []) as Array<{
    id: string;
    status: string;
    created_at: string;
  }>;

  // Calculate email stats
  const emailStats = {
    pending: emails.filter(e => e.status === "pending").length,
    sent: emails.filter(e => e.status === "sent").length,
    failed: emails.filter(e => e.status === "failed").length,
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back! Here&apos;s what&apos;s happening with your platform.
        </p>
      </div>

      {/* KPI Cards - Row 1: Orders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Orders (7d)</p>
            <div className="rounded-lg bg-blue-50 p-2">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{stats.orders7d}</p>
          <p className="mt-1 text-xs text-slate-400">
            {stats.orders30d} in last 30 days
          </p>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Revenue (30d)</p>
            <div className="rounded-lg bg-green-50 p-2">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">£{(stats.revenue30d / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
          <p className="mt-1 text-xs text-slate-400">
            From {stats.orders30d} orders
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Active Farms</p>
            <div className="rounded-lg bg-emerald-50 p-2">
              <Store className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{stats.approvedFarms}</p>
          <p className="mt-1 text-xs text-slate-400">
            {stats.pendingFarms} pending approval
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">New Users (7d)</p>
            <div className="rounded-lg bg-purple-50 p-2">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{stats.newUsers7d}</p>
          <p className="mt-1 text-xs text-slate-400">
            {stats.totalUsers} total users
          </p>
        </div>
      </div>

      {/* Order Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link 
          href="/admin/orders?status=processing" 
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
        >
          <div className="rounded-lg bg-amber-100 p-2">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{stats.processingOrders}</p>
            <p className="text-xs text-slate-500">Processing</p>
          </div>
        </Link>

        <Link 
          href="/admin/orders?status=confirmed" 
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
        >
          <div className="rounded-lg bg-blue-100 p-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{stats.confirmedOrders}</p>
            <p className="text-xs text-slate-500">Confirmed</p>
          </div>
        </Link>

        <Link 
          href="/admin/orders?status=delivered" 
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
        >
          <div className="rounded-lg bg-green-100 p-2">
            <Package className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{stats.deliveredOrders}</p>
            <p className="text-xs text-slate-500">Delivered</p>
          </div>
        </Link>

        <Link 
          href="/admin/orders?status=cancelled" 
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
        >
          <div className="rounded-lg bg-red-100 p-2">
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{stats.cancelledOrders}</p>
            <p className="text-xs text-slate-500">Cancelled</p>
          </div>
        </Link>

        <Link 
          href="/admin/orders" 
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
        >
          <div className="rounded-lg bg-slate-100 p-2">
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{stats.totalOrders}</p>
            <p className="text-xs text-slate-500">Total Orders</p>
          </div>
        </Link>
      </div>

      {/* Action Required Section */}
      {(stats.pendingFarms > 0 || stats.cancelledOrders > 0 || emailStats.failed > 0) && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h2 className="font-display text-lg font-semibold text-orange-800">
              Action Required
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.pendingFarms > 0 && (
              <Link
                href="/admin/farms?status=pending"
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-slate-900">{stats.pendingFarms} farm{stats.pendingFarms !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-slate-500">Awaiting approval</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            )}
            {stats.cancelledOrders > 0 && (
              <Link
                href="/admin/orders?status=cancelled"
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-slate-900">{stats.cancelledOrders} cancelled</p>
                    <p className="text-xs text-slate-500">Review exceptions</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            )}
            {emailStats.failed > 0 && (
              <Link
                href="/admin/emails?status=failed"
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-slate-900">{emailStats.failed} emails</p>
                    <p className="text-xs text-slate-500">Failed to send</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Orders
            </h2>
            <Link href="/admin/orders" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <div className="p-5">
                <p className="text-center text-sm text-slate-400">
                  No orders yet
                </p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                    <p className="text-xs text-slate-500">{order.farms.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">£{(order.total / 100).toFixed(2)}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === "delivered" ? "bg-green-100 text-green-700" :
                      order.status === "cancelled" ? "bg-red-100 text-red-700" :
                      order.status === "processing" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Pending approvals */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Pending Approvals
            </h2>
            <Link href="/admin/farms?status=pending" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingApprovals.length === 0 ? (
              <div className="p-5">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                  <p className="mt-2 text-sm text-slate-500">All caught up!</p>
                </div>
              </div>
            ) : (
              pendingApprovals.map((farm) => (
                <Link
                  key={farm.id}
                  href={`/admin/farms/${farm.id}`}
                  className="block px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{farm.name}</p>
                      <p className="text-xs text-slate-500">{farm.contact_email || `/${farm.slug}`}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Pending
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDistanceToNow(new Date(farm.created_at))} ago
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Activity timeline */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Activity Feed
            </h2>
          </div>
          <div className="p-5">
            {recentEvents.length === 0 ? (
              <p className="text-center text-sm text-slate-400">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {recentEvents.slice(0, 8).map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      event.event_type === "status_change" ? "bg-blue-500" :
                      event.event_type === "created" ? "bg-green-500" :
                      "bg-slate-400"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">
                          {event.orders.order_number}
                        </span>
                        {" "}
                        {event.event_type === "status_change" ? "status changed" : event.event_type}
                      </p>
                      {event.note && (
                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                          {event.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatDistanceToNow(new Date(event.created_at))} ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
