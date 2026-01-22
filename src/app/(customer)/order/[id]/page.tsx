import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import { 
  Package, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  Clock,
  ArrowLeft,
  PartyPopper
} from "lucide-react";

// Types for order with relations
interface OrderItem {
  id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  unit_snapshot: string;
  weight_snapshot: string | null;
}

interface OrderEvent {
  id: string;
  status_from: string | null;
  status_to: string;
  note: string | null;
  created_at: string;
  actor_role: string;
}

interface OrderWithRelations {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_notes: string | null;
  created_at: string;
  farm: { name: string; slug: string; hero_image_url: string | null } | null;
  order_items: OrderItem[];
  order_events: OrderEvent[];
}

export async function generateMetadata({ params }: OrderDetailPageProps) {
  const { id } = await params;
  return {
    title: `Order ${id.slice(0, 8)} | FairFarm`,
    description: "View your order details and tracking",
  };
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}

// Status configuration for display
const statusSteps = [
  { key: "processing", label: "Processing", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "ready_for_pickup", label: "Ready for Pickup", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function getStatusIndex(status: string): number {
  if (status === "cancelled" || status === "exception") return -1;
  const index = statusSteps.findIndex(s => s.key === status);
  return index >= 0 ? index : 0;
}

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=/order/${id}`);
  }

  // Fetch order with items and farm info
  const { data: orderData, error } = await supabase
    .from("orders")
    .select(`
      *,
      farm:farms(name, slug, hero_image_url),
      order_items(
        id,
        name_snapshot,
        price_snapshot,
        quantity,
        unit_snapshot,
        weight_snapshot
      ),
      order_events(
        id,
        status_from,
        status_to,
        note,
        created_at,
        actor_role
      )
    `)
    .eq("id", id)
    .eq("customer_user_id", user.id)
    .single();

  if (error || !orderData) {
    console.error("[order] Error fetching order:", error);
    notFound();
  }

  const order = orderData as unknown as OrderWithRelations;
  const currentStatusIndex = getStatusIndex(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "exception";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* New order celebration */}
      {isNew && (
        <div className="mb-8 rounded-xl bg-gradient-to-r from-farm-500 to-farm-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <PartyPopper className="h-10 w-10" />
            <div>
              <h2 className="font-display text-xl font-bold">Order Placed Successfully!</h2>
              <p className="text-farm-100">
                Thank you for your order. We&apos;ve sent a confirmation to your email.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">
            Placed on {formatDateTime(order.created_at)}
          </p>
        </div>
        {order.farm && (
          <Link
            href={`/farm/${order.farm.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            <Package className="h-4 w-4" />
            {order.farm.name}
          </Link>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status timeline */}
          <div className="rounded-xl border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">Order Status</h2>
            
            {isCancelled ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
                <p className="font-medium">
                  {order.status === "cancelled" ? "Order Cancelled" : "Issue with Order"}
                </p>
                <p className="text-sm mt-1">
                  Please contact support if you have questions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {statusSteps.map((step, index) => {
                  const isComplete = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex items-center gap-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isComplete 
                          ? "bg-farm-500 text-white" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isCurrent ? "text-farm-700" : isComplete ? "" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-muted-foreground">Current status</p>
                        )}
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div className={`hidden sm:block h-px w-16 ${
                          index < currentStatusIndex ? "bg-farm-500" : "bg-muted"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order items */}
          <div className="rounded-xl border p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name_snapshot}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.weight_snapshot} · {item.unit_snapshot} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    £{((item.price_snapshot * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order history */}
          {order.order_events && order.order_events.length > 0 && (
            <div className="rounded-xl border p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Order History</h2>
              <div className="space-y-3">
                {order.order_events
                  .sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  .map((event) => (
                  <div key={event.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-farm-500" />
                    <div>
                      <p className="font-medium capitalize">{event.status_to.replace(/_/g, " ")}</p>
                      {event.note && <p className="text-muted-foreground">{event.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Delivery address */}
            <div className="rounded-xl border p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-display text-lg font-semibold">Delivery Address</h2>
              </div>
              <p className="text-sm whitespace-pre-line">{order.delivery_address}</p>
              {order.delivery_notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{order.delivery_notes}</p>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="rounded-xl border p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>£{(order.subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>£{(order.delivery_fee / 100).toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>£{(order.total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Support link */}
            <div className="rounded-xl border p-6 bg-muted/30">
              <h3 className="font-medium mb-2">Need help?</h3>
              <p className="text-sm text-muted-foreground">
                Contact support at{" "}
                <a href="mailto:support@FairFarm.uk" className="text-farm-600 hover:underline">
                  support@FairFarm.uk
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
