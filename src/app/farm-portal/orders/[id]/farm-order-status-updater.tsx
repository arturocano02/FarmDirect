"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ChevronDown, 
  MessageSquare,
  CheckCircle,
  Clock,
  Package,
  Truck,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { updateFarmOrderStatusAction } from "../actions";

interface FarmOrderStatusUpdaterProps {
  orderId: string;
  currentStatus: string;
}

const ORDER_STATUSES = [
  { value: "processing", label: "New Order", icon: Clock, nextAction: "Confirm Order" },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle, nextAction: "Start Preparing" },
  { value: "preparing", label: "Preparing", icon: Package, nextAction: "Mark Ready" },
  { value: "ready_for_pickup", label: "Ready for Pickup", icon: Package, nextAction: "Out for Delivery" },
  { value: "out_for_delivery", label: "Out for Delivery", icon: Truck, nextAction: "Mark Delivered" },
  { value: "delivered", label: "Delivered", icon: CheckCircle, nextAction: null },
  { value: "cancelled", label: "Cancelled", icon: XCircle, nextAction: null },
  { value: "exception", label: "Exception", icon: AlertTriangle, nextAction: null },
] as const;

const getNextStatus = (current: string): string | null => {
  const statusOrder = ["processing", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered"];
  const currentIndex = statusOrder.indexOf(current);
  if (currentIndex === -1 || currentIndex >= statusOrder.length - 1) return null;
  return statusOrder[currentIndex + 1];
};

export function FarmOrderStatusUpdater({ orderId, currentStatus }: FarmOrderStatusUpdaterProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nextStatus = getNextStatus(currentStatus);
  const currentConfig = ORDER_STATUSES.find(s => s.value === currentStatus);

  const handleQuickUpdate = () => {
    if (!nextStatus) return;
    
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateFarmOrderStatusAction(orderId, nextStatus);

      if (result.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to update order");
      }
    });
  };

  const handleUpdate = () => {
    if (status === currentStatus && !note) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateFarmOrderStatusAction(orderId, status, note || undefined);

      if (result.success) {
        setSuccess(true);
        setNote("");
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to update order");
      }
    });
  };

  const isTerminalStatus = ["delivered", "cancelled"].includes(currentStatus);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h2 className="font-semibold text-slate-900">Update Order</h2>
      </div>
      <div className="p-5 space-y-4">
        {/* Quick action button */}
        {nextStatus && !isTerminalStatus && (
          <button
            onClick={handleQuickUpdate}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-farm-600 px-4 py-3 text-sm font-semibold text-white hover:bg-farm-700 focus:outline-none focus:ring-2 focus:ring-farm-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {currentConfig?.nextAction || "Update Status"}
              </>
            )}
          </button>
        )}

        {isTerminalStatus && (
          <div className="text-center py-2">
            <p className="text-sm text-slate-500">
              This order is {currentStatus}. No further updates available.
            </p>
          </div>
        )}

        {/* Divider */}
        {!isTerminalStatus && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">or choose status</span>
            </div>
          </div>
        )}

        {/* Status dropdown */}
        {!isTerminalStatus && (
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Order Status
            </label>
            <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isPending}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium focus:border-farm-500 focus:outline-none focus:ring-1 focus:ring-farm-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Note input */}
        {!isTerminalStatus && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <MessageSquare className="inline h-4 w-4 mr-1" />
              Add Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              placeholder="Note for your records or the customer..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-farm-500 focus:outline-none focus:ring-1 focus:ring-farm-500 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Order updated successfully!
          </div>
        )}

        {/* Update button */}
        {!isTerminalStatus && (status !== currentStatus || note) && (
          <button
            onClick={handleUpdate}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-farm-500 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Order"
            )}
          </button>
        )}

        {/* Cancel option */}
        {!isTerminalStatus && currentStatus !== "cancelled" && (
          <button
            onClick={() => {
              setStatus("cancelled");
              setNote("Order cancelled by farm");
            }}
            disabled={isPending}
            className="w-full text-sm text-red-600 hover:text-red-700 hover:underline"
          >
            Cancel this order
          </button>
        )}
      </div>
    </div>
  );
}
