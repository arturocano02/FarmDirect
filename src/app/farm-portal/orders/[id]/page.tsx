import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatDistanceToNow } from "@/lib/utils/date";
import { 
  ArrowLeft, 
  MapPin, 
  Package, 
  User, 
  Clock, 
  Phone, 
  Mail,
  Calendar,
  Truck,
  MessageSquare,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { FarmOrderStatusUpdater } from "./farm-order-status-updater";

// Types for order with relations
interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  unit_label: string;
  weight_label: string | null;
}

interface OrderEvent {
  id: string;
  event_type: string;
  note: string | null;
  created_at: string;
}

interface FarmOrderWithRelations {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_address_json: Record<string, unknown> | null;
  delivery_notes: string | null;
  requested_delivery_date?: string | null;
  created_at: string;
  customer_email: string | null;
  customer_email_snapshot: string | null;
  customer_phone: string | null;
  customer: { name: string | null } | null;
  order_items: OrderItem[];
  order_events: OrderEvent[];
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  processing: { label: "New Order", color: "text-blue-700", bgColor: "bg-blue-100 border-blue-200" },
  confirmed: { label: "Confirmed", color: "text-green-700", bgColor: "bg-green-100 border-green-200" },
  preparing: { label: "Preparing", color: "text-amber-700", bgColor: "bg-amber-100 border-amber-200" },
  ready_for_pickup: { label: "Ready", color: "text-purple-700", bgColor: "bg-purple-100 border-purple-200" },
  out_for_delivery: { label: "Out for Delivery", color: "text-indigo-700", bgColor: "bg-indigo-100 border-indigo-200" },
  delivered: { label: "Delivered", color: "text-emerald-700", bgColor: "bg-emerald-100 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-100 border-red-200" },
  exception: { label: "Issue", color: "text-red-700", bgColor: "bg-red-100 border-red-200" },
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Order ${id.slice(0, 8)} | Farm Portal`,
    description: "View and manage order",
  };
}

interface FarmOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FarmOrderDetailPage({ params }: FarmOrderDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=/farm-portal/orders/${id}`);
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

  // Fetch order (must belong to this farm)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseSelect = `
      id,
      order_number,
      status,
      subtotal,
      delivery_fee,
      total,
      delivery_address,
      delivery_address_json,
      delivery_notes,
      created_at,
      customer_email,
      customer_email_snapshot,
      customer_phone,
      customer:profiles!customer_user_id(name),
      order_items(
        id,
        product_name,
        unit_price,
        quantity,
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
    `;

  const selectWithRequestedDate = `
      ${baseSelect},
      requested_delivery_date
    `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: orderData, error } = await (supabase as any)
    .from("orders")
    .select(selectWithRequestedDate)
    .eq("id", id)
    .eq("farm_id", farm.id)
    .order("created_at", { foreignTable: "order_events", ascending: false })
    .single();

  if (error?.message?.includes("requested_delivery_date")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retry = await (supabase as any)
      .from("orders")
      .select(baseSelect)
      .eq("id", id)
      .eq("farm_id", farm.id)
      .order("created_at", { foreignTable: "order_events", ascending: false })
      .single();

    orderData = retry.data;
    error = retry.error;

    if (!retry.error) {
      console.warn("[farm-order] requested_delivery_date column missing; fell back without it.");
    }
  }

  if (error || !orderData) {
    console.error("[farm-order] Error fetching order:", error);
    notFound();
  }

  const order = orderData as unknown as FarmOrderWithRelations;
  const status = statusConfig[order.status] || { label: order.status, color: "text-slate-700", bgColor: "bg-slate-100 border-slate-200" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/farm-portal/orders"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{order.order_number}</h1>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${status.bgColor} ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Placed {formatDistanceToNow(new Date(order.created_at))} ago
          </p>
        </div>
      </div>

      {/* Status alerts */}
      {order.status === "processing" && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">New order awaiting confirmation</p>
            <p className="text-sm text-blue-700 mt-1">
              Review the order details and confirm to start processing.
            </p>
          </div>
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">This order has been cancelled</p>
            <p className="text-sm text-red-700 mt-1">
              No further action is required.
            </p>
          </div>
        </div>
      )}

      {order.status === "delivered" && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Order delivered successfully!</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">Order Items</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {order.order_items.map((item) => (
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900">
                  £{(order.subtotal / 100).toFixed(2)}
                </span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex items-center justify-between text-sm mt-2">
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

          {/* Delivery Details */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">Delivery Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Delivery Address</p>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                    {order.delivery_address}
                  </p>
                  {(order.delivery_address_json as { postcode?: string } | null)?.postcode && (
                    <p className="text-sm font-mono text-slate-500 mt-1">
                      {(order.delivery_address_json as { postcode?: string } | null)?.postcode}
                    </p>
                  )}
                </div>
              </div>
              
              {order.requested_delivery_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Requested Date</p>
                    <p className="text-sm text-slate-600 mt-1">
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

              {order.delivery_notes && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm font-medium text-amber-800">Delivery Instructions</p>
                  <p className="text-sm text-amber-700 mt-1">{order.delivery_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">Order Timeline</h2>
            </div>
            <div className="p-5">
              {order.order_events.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No events recorded yet
                </p>
              ) : (
                <div className="space-y-4">
                  {order.order_events.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${index === 0 ? "bg-farm-600" : "bg-slate-300"}`} />
                        {index < order.order_events.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-slate-900 capitalize">
                          {event.event_type.replace("_", " ")}
                        </p>
                        {event.note && (
                          <p className="text-sm text-slate-600 mt-0.5">{event.note}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDateTime(event.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Status & Actions */}
        <div className="space-y-6">
          {/* Status Updater */}
          <FarmOrderStatusUpdater 
            orderId={order.id} 
            currentStatus={order.status} 
          />

          {/* Customer Info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">Customer</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-medium text-slate-900">
                {order.customer?.name || "Customer"}
              </p>
              {order.customer_email && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${order.customer_email}`} className="hover:text-farm-600">
                    {order.customer_email}
                  </a>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${order.customer_phone}`} className="hover:text-farm-600">
                    {order.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-medium text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <MessageSquare className="h-4 w-4" />
                Contact Customer
              </button>
              <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                🖨️ Print Packing Slip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
