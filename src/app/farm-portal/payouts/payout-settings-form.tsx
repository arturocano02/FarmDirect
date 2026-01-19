"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface PayoutSettingsFormProps {
  farmId: string;
  existingSettings: {
    payout_method: string | null;
    account_holder_name: string | null;
    sort_code: string | null;
    account_number_last4: string | null;
    bank_name: string | null;
  } | null;
}

export function PayoutSettingsForm({ farmId, existingSettings }: PayoutSettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [accountHolderName, setAccountHolderName] = useState(existingSettings?.account_holder_name || "");
  const [sortCode, setSortCode] = useState(existingSettings?.sort_code || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState(existingSettings?.bank_name || "");

  // Format sort code as XX-XX-XX
  const formatSortCode = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  };

  const handleSortCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSortCode(formatSortCode(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate
    if (!accountHolderName.trim()) {
      setError("Please enter the account holder name");
      return;
    }

    const sortCodeDigits = sortCode.replace(/\D/g, "");
    if (sortCodeDigits.length !== 6) {
      setError("Please enter a valid 6-digit sort code");
      return;
    }

    if (!accountNumber.trim() || accountNumber.length < 8) {
      setError("Please enter a valid 8-digit account number");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/farm/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          farm_id: farmId,
          payout_method: "bank_transfer",
          account_holder_name: accountHolderName.trim(),
          sort_code: sortCode.replace(/-/g, ""),
          account_number_last4: accountNumber.slice(-4),
          bank_name: bankName.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save payout settings");
      }

      setSuccess(true);
      setAccountNumber(""); // Clear for security
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">Bank details saved successfully!</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Account Holder Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            placeholder="Name on the bank account"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-farm-500 focus:outline-none focus:ring-1 focus:ring-farm-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Sort Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={sortCode}
            onChange={handleSortCodeChange}
            placeholder="XX-XX-XX"
            maxLength={8}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono focus:border-farm-500 focus:outline-none focus:ring-1 focus:ring-farm-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="8-digit account number"
            maxLength={8}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono focus:border-farm-500 focus:outline-none focus:ring-1 focus:ring-farm-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            Only the last 4 digits will be stored
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Bank Name <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., Barclays, HSBC, Monzo"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-farm-500 focus:outline-none focus:ring-1 focus:ring-farm-500"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-farm-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-farm-700 focus:outline-none focus:ring-2 focus:ring-farm-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Bank Details"
          )}
        </button>
      </div>
    </form>
  );
}
