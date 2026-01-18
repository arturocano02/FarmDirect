"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface FarmStatusActionsProps {
  farmId: string;
  currentStatus: string;
}

export function FarmStatusActions({ farmId, currentStatus }: FarmStatusActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("farms")
        .update({ status: newStatus })
        .eq("id", farmId);

      if (updateError) throw updateError;

      setSuccess(`Farm ${newStatus === "approved" ? "approved" : newStatus === "suspended" ? "suspended" : "status updated"} successfully!`);
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error updating farm status:", err);
      setError(err instanceof Error ? err.message : "Failed to update farm status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h2 className="font-semibold text-slate-900">Farm Status</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Current status:</span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
            currentStatus === "approved" 
              ? "bg-green-100 text-green-700 border-green-200"
              : currentStatus === "pending"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-red-100 text-red-700 border-red-200"
          }`}>
            {currentStatus}
          </span>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}

        <div className="space-y-2">
          {currentStatus === "pending" && (
            <button
              onClick={() => handleStatusChange("approved")}
              disabled={isUpdating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve Farm
            </button>
          )}

          {currentStatus === "approved" && (
            <button
              onClick={() => handleStatusChange("suspended")}
              disabled={isUpdating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Suspend Farm
            </button>
          )}

          {currentStatus === "suspended" && (
            <button
              onClick={() => handleStatusChange("approved")}
              disabled={isUpdating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Reactivate Farm
            </button>
          )}

          {(currentStatus === "pending" || currentStatus === "approved") && (
            <button
              onClick={() => handleStatusChange("suspended")}
              disabled={isUpdating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Suspend Farm
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center">
          {currentStatus === "pending" 
            ? "Approve this farm to make it visible to customers."
            : currentStatus === "approved"
              ? "This farm is live and visible to customers."
              : "This farm is suspended and hidden from customers."}
        </p>
      </div>
    </div>
  );
}
