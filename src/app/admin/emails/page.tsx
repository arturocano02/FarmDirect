import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "@/lib/utils/date";
import { 
  Search,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

export const metadata = {
  title: "Emails",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function AdminEmailsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Check if email_outbox table exists and fetch data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("email_outbox")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status && ["pending", "sent", "failed"].includes(params.status)) {
    query = query.eq("status", params.status);
  }

  const { data: emailsData, error } = await query.limit(100);

  // If table doesn't exist, show empty state
  const tableExists = !error || !error.message?.includes("relation");
  
  let emails = (emailsData || []) as Array<{
    id: string;
    to_email: string;
    subject: string;
    status: string;
    error_message: string | null;
    created_at: string;
    sent_at: string | null;
  }>;

  // Apply search filter
  if (params.search && emails.length > 0) {
    const searchLower = params.search.toLowerCase();
    emails = emails.filter(email =>
      email.to_email.toLowerCase().includes(searchLower) ||
      email.subject.toLowerCase().includes(searchLower)
    );
  }

  // Get status counts
  const statusCounts: Record<string, number> = { pending: 0, sent: 0, failed: 0 };
  if (tableExists && emailsData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emailsData.forEach((email: any) => {
      statusCounts[email.status] = (statusCounts[email.status] || 0) + 1;
    });
  }

  const totalEmails = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "failed":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return CheckCircle;
      case "pending":
        return Clock;
      case "failed":
        return XCircle;
      default:
        return Mail;
    }
  };

  if (!tableExists) {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emails</h1>
          <p className="mt-1 text-sm text-slate-500">
            Email outbox and delivery logs
          </p>
        </div>

        {/* Empty state - no table */}
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            Email Outbox Not Set Up
          </h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            The email_outbox table doesn&apos;t exist yet. This table is created when you set up email notifications with Resend.
          </p>
          <div className="mt-6 p-4 bg-slate-50 rounded-lg text-left max-w-md mx-auto">
            <p className="text-xs font-mono text-slate-600">
              -- Create email_outbox table<br />
              CREATE TABLE email_outbox (<br />
              &nbsp;&nbsp;id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br />
              &nbsp;&nbsp;to_email TEXT NOT NULL,<br />
              &nbsp;&nbsp;subject TEXT NOT NULL,<br />
              &nbsp;&nbsp;html_body TEXT,<br />
              &nbsp;&nbsp;text_body TEXT,<br />
              &nbsp;&nbsp;status TEXT DEFAULT &apos;pending&apos;,<br />
              &nbsp;&nbsp;error_message TEXT,<br />
              &nbsp;&nbsp;created_at TIMESTAMPTZ DEFAULT NOW(),<br />
              &nbsp;&nbsp;sent_at TIMESTAMPTZ<br />
              );
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emails</h1>
        <p className="mt-1 text-sm text-slate-500">
          Email outbox and delivery logs
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <form method="GET" className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Search by email or subject..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {params.status && <input type="hidden" name="status" value={params.status} />}
          </form>

          {/* Status tabs */}
          <div className="flex gap-2">
            <a
              href={`/admin/emails${params.search ? `?search=${params.search}` : ""}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                !params.status
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
              <span className={`rounded-full px-1.5 py-0.5 ${!params.status ? "bg-white/20" : "bg-slate-100"}`}>
                {totalEmails}
              </span>
            </a>
            {[
              { value: "pending", label: "Pending", icon: Clock },
              { value: "sent", label: "Sent", icon: CheckCircle },
              { value: "failed", label: "Failed", icon: XCircle },
            ].map((status) => {
              const count = statusCounts[status.value] || 0;
              const isActive = params.status === status.value;
              return (
                <a
                  key={status.value}
                  href={`/admin/emails?status=${status.value}${params.search ? `&search=${params.search}` : ""}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : status.value === "failed" && count > 0
                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {status.label}
                  <span className={`rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : status.value === "failed" && count > 0 ? "bg-red-200" : "bg-slate-100"}`}>
                    {count}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Failed emails alert */}
      {statusCounts.failed > 0 && !params.status && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">
              {statusCounts.failed} email{statusCounts.failed !== 1 ? "s" : ""} failed to send
            </p>
            <p className="text-sm text-red-700 mt-1">
              Review failed emails and check your email configuration.
            </p>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">{emails.length}</span> emails
          {params.search && (
            <> matching &quot;<span className="font-medium text-slate-900">{params.search}</span>&quot;</>
          )}
        </p>
      </div>

      {/* Emails table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  To
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Subject
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Created
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sent
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Mail className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-900">No emails found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {params.status || params.search 
                        ? "Try adjusting your filters"
                        : "Emails will appear here when sent"}
                    </p>
                  </td>
                </tr>
              ) : (
                emails.map((email) => {
                  const StatusIcon = getStatusIcon(email.status);
                  return (
                    <tr key={email.id} className="hover:bg-slate-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadge(email.status)}`}>
                          <StatusIcon className="h-3 w-3" />
                          {email.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-sm text-slate-900">{email.to_email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 line-clamp-1">
                          {email.subject}
                        </span>
                        {email.error_message && (
                          <p className="text-xs text-red-500 mt-0.5 line-clamp-1">
                            {email.error_message}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(email.created_at))} ago
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {email.sent_at ? (
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(email.sent_at))} ago
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {email.status === "failed" && (
                          <button 
                            className="text-slate-400 hover:text-orange-600 transition-colors"
                            title="Retry"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
