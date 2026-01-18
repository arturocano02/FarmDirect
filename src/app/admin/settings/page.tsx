import { 
  Mail,
  CreditCard,
  Bell,
  Globe,
  Lock
} from "lucide-react";

export const metadata = {
  title: "Settings",
};

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform configuration and preferences
        </p>
      </div>

      {/* Settings sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <Globe className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">General</h2>
              <p className="text-xs text-slate-500">Platform name and branding</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500">
              General settings configuration coming soon.
            </p>
          </div>
        </div>

        {/* Email */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Email</h2>
              <p className="text-xs text-slate-500">Email provider and templates</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Provider</span>
              <span className="text-sm font-medium text-slate-900">Resend</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">From Address</span>
              <span className="text-sm font-mono text-slate-500">noreply@farmdirect.app</span>
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CreditCard className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Payments</h2>
              <p className="text-xs text-slate-500">Stripe configuration</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Provider</span>
              <span className="text-sm font-medium text-slate-900">Stripe</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Mode</span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Test Mode
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Bell className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">Alert preferences</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500">
              Notification settings coming soon.
            </p>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <Lock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Security</h2>
              <p className="text-xs text-slate-500">Admin access and permissions</p>
            </div>
          </div>
          <div className="p-5">
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Admin Email Allowlist</h3>
              <p className="mt-1 text-sm text-slate-600">
                Admin users are managed via the <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">ADMIN_EMAILS</code> environment variable.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Add comma-separated emails to grant admin access automatically on login.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
