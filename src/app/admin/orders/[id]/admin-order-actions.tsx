"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { OrderStatus } from "@/types/database";

const ORDER_STATUSES: OrderStatus[] = [
  "processing",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "exception",
];

interface AdminOrderActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function AdminOrderActions({ orderId, currentStatus }: AdminOrderActionsProps) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdateStatus() {
    if (newStatus === currentStatus && !note) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      router.refresh();
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="font-semibold mb-4">Update Status</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
            disabled={isSubmitting}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this status change..."
            disabled={isSubmitting}
            rows={2}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={handleUpdateStatus}
          disabled={isSubmitting || (newStatus === currentStatus && !note)}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </span>
          ) : (
            "Update Status"
          )}
        </button>
      </div>
    </div>
  );
}
