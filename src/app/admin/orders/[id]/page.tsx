import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "@/lib/utils/date";
import { 
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  Mail,
  Clock,
  Truck,
  User,
  Store,
  Calendar,
  CreditCard
} from "lucide-react";
import { OrderStatusUpdater } from "./order-status-updater";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Order ${id.slice(0, 8)}...`,
  };
}

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Dev-only logging
  if (process.env.NODE_ENV === "development") {
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[admin/orders/[id]] Fetching order for user:", user?.id ?? "anon");
  }

  // Fetch order with related data - use left joins (no !inner) for safety
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select(`
      *,
      farms(id, name, slug, contact_email, postcode),
      profiles(id, name),
      order_items(
        id,
        product_name,
        quantity,
        unit_price,
        total_price,
        unit_label,
        weight_label
      ),
      order_events(
        id,
        event_type,
        note,
        created_at
      )
    `)
    .eq("id", id)
    .order("created_at", { foreignTable: "order_events", ascending: false })
    .single();

  if (error || !order) {
    console.error("[admin/orders/[id]] Error:", error);
    if (process.env.NODE_ENV === "development" && error) {
      console.error("[admin/orders/[id]] Error details:", JSON.stringify(error, null, 2));
    }
    notFound();
  }

  // Get customer info - handle nullable joins safely
  const customerName = order.profiles?.name || "Guest Customer";
  const customerEmail = order.customer_email || null;
  const farmData = order.farms || { id: null, name: "Unknown Farm", slug: "", contact_email: null, postcode: null };

  // Format date
  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getStatusColor = (status: string) => {
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
      case "out_for_delivery":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPaymentColor = (status: string | null) => {
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Order {order.order_number}
            </h1>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
              {order.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                Order Items
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {order.order_items.map((item: { id: string; product_name: string; quantity: number; unit_price: number; total_price: number; unit_label: string; weight_label: string | null }) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{item.product_name}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} × £{(item.unit_price / 100).toFixed(2)} {item.unit_label}
                      {item.weight_label && ` • ${item.weight_label}`}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    £{(item.total_price / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900">
                  £{(order.subtotal / 100).toFixed(2)}
                </span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-600">Delivery</span>
                  <span className="font-medium text-slate-900">
                    £{(order.delivery_fee / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold text-slate-900">
                  £{(order.total / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-500" />
                Delivery Details
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Delivery Address</p>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                    {order.delivery_address}
                  </p>
                  {order.delivery_postcode && (
                    <p className="text-sm font-mono text-slate-500 mt-1">
                      {order.delivery_postcode}
                    </p>
                  )}
                </div>
              </div>
              {order.delivery_instructions && (
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">Delivery Instructions</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {order.delivery_instructions}
                  </p>
                </div>
              )}
              {order.requested_delivery_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Requested Date</p>
                    <p className="text-sm text-slate-600">
                      {new Date(order.requested_delivery_date).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                Order Timeline
              </h2>
            </div>
            <div className="p-5">
              {order.order_events.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No events recorded
                </p>
              ) : (
                <div className="space-y-4">
                  {order.order_events.map((event: { id: string; event_type: string; note: string | null; created_at: string }, index: number) => (
                    <div key={event.id} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${index === 0 ? "bg-orange-500" : "bg-slate-300"}`} />
                        {index < order.order_events.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-slate-900 capitalize">
                          {event.event_type.replace("_", " ")}
                        </p>
                        {event.note && (
                          <p className="text-sm text-slate-600 mt-0.5">
                            {event.note}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
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

        {/* Right column - Status & Info */}
        <div className="space-y-6">
          {/* Status Updater */}
          <OrderStatusUpdater 
            orderId={order.id} 
            currentStatus={order.status} 
          />

          {/* Customer Info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                Customer
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-medium text-slate-900">{customerName}</p>
              {customerEmail && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${customerEmail}`} className="hover:text-orange-600">
                    {customerEmail}
                  </a>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${order.customer_phone}`} className="hover:text-orange-600">
                    {order.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Farm Info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Store className="h-4 w-4 text-slate-500" />
                Farm
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {farmData.id ? (
                <Link 
                  href={`/admin/farms/${farmData.id}`}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                >
                  {farmData.name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-slate-500">{farmData.name}</span>
              )}
              {farmData.contact_email && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${farmData.contact_email}`} className="hover:text-orange-600">
                    {farmData.contact_email}
                  </a>
                </div>
              )}
              {farmData.postcode && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {farmData.postcode}
                </div>
              )}
              {farmData.slug && (
                <Link
                  href={`/farm/${farmData.slug}`}
                  target="_blank"
                  className="block text-xs text-slate-500 hover:text-orange-600"
                >
                  View public page →
                </Link>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                Payment
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${getPaymentColor(order.payment_status)}`}>
                  {order.payment_status || "n/a"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Method</span>
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {order.payment_method || "Not specified"}
                </span>
              </div>
              {order.stripe_payment_intent_id && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Stripe Payment Intent</p>
                  <p className="text-xs font-mono text-slate-600 mt-1 break-all">
                    {order.stripe_payment_intent_id}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-medium text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/order/${order.id}`}
                target="_blank"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                View Customer Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
