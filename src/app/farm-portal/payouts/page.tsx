import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreditCard, Clock } from "lucide-react";
import { PayoutSettingsForm } from "./payout-settings-form";

export const metadata = {
  title: "Payouts | Farm Portal",
  description: "Manage your payout settings",
};

export const dynamic = "force-dynamic";

export default async function FarmPayoutsPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/farm-portal/payouts");
  }

  // Get user's farm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: farmData, error: farmError } = await (supabase as any)
    .from("farms")
    .select("id, name, status")
    .eq("owner_user_id", user.id)
    .single();

  if (farmError || !farmData) {
    redirect("/farm-portal/onboarding");
  }

  const farm = farmData as { id: string; name: string; status: string };

  // Get existing payout settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payoutData } = await (supabase as any)
    .from("farm_payouts")
    .select("*")
    .eq("farm_id", farm.id)
    .single();

  const payoutSettings = payoutData as {
    payout_method: string | null;
    account_holder_name: string | null;
    sort_code: string | null;
    account_number_last4: string | null;
    bank_name: string | null;
  } | null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage how you receive payments from {farm.name}
        </p>
      </div>

      {/* Coming soon banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-100 p-2">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-amber-800">Payments Coming Soon</h2>
            <p className="mt-2 text-sm text-amber-700">
              Online payments are not yet live. For now, you can collect payments directly from customers 
              on delivery. We&apos;re working on Stripe integration for seamless online payments.
            </p>
            <p className="mt-3 text-sm text-amber-700">
              You can still set up your bank details below so you&apos;re ready when we launch.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Stats Placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Available Balance</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">£0.00</p>
          <p className="mt-1 text-xs text-slate-400">Payments not yet enabled</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">£0.00</p>
          <p className="mt-1 text-xs text-slate-400">Processing orders</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">This Month</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">£0.00</p>
          <p className="mt-1 text-xs text-slate-400">Total received</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">All Time</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">£0.00</p>
          <p className="mt-1 text-xs text-slate-400">Total payouts</p>
        </div>
      </div>

      {/* Payout Settings Form */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="font-semibold text-slate-900">Bank Account Details</h2>
              <p className="text-sm text-slate-500">Where we&apos;ll send your earnings</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {payoutSettings?.account_number_last4 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-1">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">Bank account saved</p>
                  <p className="text-sm text-green-700 mt-1">
                    {payoutSettings.bank_name || "Bank"} ···· {payoutSettings.account_number_last4}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {payoutSettings.account_holder_name}
                  </p>
                </div>
              </div>
              <PayoutSettingsForm farmId={farm.id} existingSettings={payoutSettings} />
            </div>
          ) : (
            <PayoutSettingsForm farmId={farm.id} existingSettings={null} />
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-slate-900">When will online payments go live?</p>
            <p className="text-slate-600 mt-1">
              We&apos;re currently testing Stripe integration. You&apos;ll receive an email when it&apos;s ready.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900">How do I collect payment now?</p>
            <p className="text-slate-600 mt-1">
              You can collect cash on delivery or arrange direct bank transfers with your customers.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900">Is my bank information secure?</p>
            <p className="text-slate-600 mt-1">
              Yes. We only store the last 4 digits of your account number. Full details will be 
              collected securely via Stripe when payments go live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
