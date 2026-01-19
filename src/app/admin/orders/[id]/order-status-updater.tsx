"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, MessageSquare } from "lucide-react";
import { updateOrderStatusAction } from "../actions";

interface OrderStatusUpdaterProps {
  orderId: string;
  currentStatus: string;
}

const ORDER_STATUSES = [
  { value: "processing", label: "Processing" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "exception", label: "Exception" },
] as const;

export function OrderStatusUpdater({ orderId, currentStatus }: OrderStatusUpdaterProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    if (status === currentStatus && !note) {
      return;
    }

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, status, note || undefined);

      if (result.success) {
        setSuccess(true);
        setNote("");
        router.refresh();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to update order");
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h2 className="font-semibold text-slate-900">Update Status</h2>
      </div>
      <div className="p-5 space-y-4">
        {/* Status dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Order Status
          </label>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isPending}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium capitalize focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-50 disabled:text-slate-500"
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

        {/* Note input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <MessageSquare className="inline h-4 w-4 mr-1" />
            Add Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
            placeholder="Internal note about this status change..."
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Order updated successfully!
          </div>
        )}

        {/* Update button */}
        <button
          onClick={handleUpdate}
          disabled={isPending || (status === currentStatus && !note)}
          className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>
  );
}
