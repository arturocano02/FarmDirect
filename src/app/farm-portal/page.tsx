import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "@/lib/utils/date";
import { ShoppingBag, Package, TrendingUp, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Farm Dashboard",
  description: "Manage your farm on Farmlink",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ submitted?: string; welcome?: string }>;
}

export default async function FarmDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showSubmittedBanner = params.submitted === "true";
  const showWelcomeBanner = params.welcome === "true";
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's farm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: farmData } = await (supabase as any)
    .from("farms")
    .select("id, name, status")
    .eq("owner_user_id", user.id)
    .single();

  if (!farmData) {
    redirect("/farm-portal/setup");
  }
  
  const farm = farmData as { id: string; name: string; status: string };

  // Fetch stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [ordersResult, pendingOrdersResult, productsResult, recentOrdersResult] = await Promise.all([
    sb.from("orders").select("total", { count: "exact" }).eq("farm_id", farm.id),
    sb.from("orders").select("id", { count: "exact", head: true })
      .eq("farm_id", farm.id)
      .in("status", ["processing", "confirmed"]),
    sb.from("products").select("id", { count: "exact", head: true })
      .eq("farm_id", farm.id)
      .eq("is_active", true),
    sb.from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        created_at,
        profiles!inner(name)
      `)
      .eq("farm_id", farm.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalOrders = ordersResult.count || 0;
  const pendingOrders = pendingOrdersResult.count || 0;
  const activeProducts = productsResult.count || 0;
  
  // Calculate revenue (all time for now)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenue = ordersResult.data?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0;

  const recentOrders = (recentOrdersResult.data || []) as Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
    profiles: { name: string | null };
  }>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-heading">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {farm.name}
        </p>
      </div>

      {/* Submitted success banner */}
      {showSubmittedBanner && (
        <div className="rounded-lg bg-farm-50 border border-farm-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-farm-600 mt-0.5" />
          <div>
            <p className="font-medium text-farm-800">Farm Submitted for Approval!</p>
            <p className="text-sm text-farm-700 mt-1">
              Your farm has been submitted for review. Our team will review your application within 24-48 hours.
              You can continue managing your products and settings while waiting.
            </p>
          </div>
        </div>
      )}

      {/* Welcome banner for first-time completion */}
      {showWelcomeBanner && !showSubmittedBanner && (
        <div className="rounded-lg bg-gradient-to-r from-amber-50 to-farm-50 border border-amber-200 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Welcome to Your Farm Dashboard!</p>
            <p className="text-sm text-amber-700 mt-1">
              Your farm is set up and ready. Start by adding more products or customizing your delivery settings.
            </p>
          </div>
        </div>
      )}

      {/* Status banner */}
      {farm.status === "pending" && !showSubmittedBanner && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Awaiting Approval</p>
            <p className="text-sm text-amber-700 mt-1">
              Your farm is under review. You can still manage products and settings while waiting.
            </p>
          </div>
        </div>
      )}

      {farm.status === "suspended" && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Farm Suspended</p>
            <p className="text-sm text-red-700 mt-1">
              Your farm has been suspended and is not visible to customers. Please contact support.
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/farm-portal/orders" className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{totalOrders}</p>
        </Link>
        
        <Link href="/farm-portal/orders?status=processing" className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pending Orders</p>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{pendingOrders}</p>
        </Link>
        
        <Link href="/farm-portal/products" className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active Products</p>
            <Package className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{activeProducts}</p>
        </Link>
        
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <TrendingUp className="h-5 w-5 text-farm-600" />
          </div>
          <p className="mt-2 text-3xl font-semibold">£{(revenue / 100).toFixed(2)}</p>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent Orders</h2>
          <Link href="/farm-portal/orders" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y">
          {recentOrders.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No orders yet. Orders will appear here when customers place them.
            </div>
          ) : (
            recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/farm-portal/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.profiles.name || "Customer"} · {formatDistanceToNow(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{(order.total / 100).toFixed(2)}</p>
                  <Badge status={order.status as "processing" | "confirmed" | "preparing"}>
                    {order.status.replace("_", " ")}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
