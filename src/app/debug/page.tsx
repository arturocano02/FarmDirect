import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Debug page - DEVELOPMENT ONLY
 * Shows Supabase connection status, farm counts, session info, and RLS tests
 */
export default async function DebugPage() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let farmsCount = 0;
  let productsCount = 0;
  let ordersCount = 0;
  let sampleFarms: Array<{ name: string; slug: string }> = [];
  let recentOrderIds: string[] = [];
  let farmsError: string | null = null;
  let sessionExists = false;
  let sessionEmail: string | null = null;
  
  // RLS test results
  const rlsTests: Record<string, { canRead: boolean; error?: string }> = {};

  if (supabaseAnonKey) {
    try {
      // Create anonymous client for data queries
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Query farms
      const { count, error } = await supabase
        .from("farms")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      if (error) {
        farmsError = `${error.message} (code: ${error.code})`;
      } else {
        farmsCount = count || 0;
      }

      // Query products
      const { count: pCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      productsCount = pCount || 0;

      // Get sample farms
      const { data } = await supabase
        .from("farms")
        .select("name, slug")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(3);
      sampleFarms = data || [];

      // Query orders (may fail due to RLS for anon user)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (ordersError) {
        rlsTests.orders = { canRead: false, error: ordersError.message };
      } else {
        ordersCount = ordersData?.length || 0;
        recentOrderIds = ordersData?.map(o => o.id.slice(0, 8)) || [];
        rlsTests.orders = { canRead: true };
      }

      // RLS tests for Phase D tables
      const tablesToTest = ["addresses", "email_outbox", "internal_notes"];
      
      for (const table of tablesToTest) {
        const { error: testError } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .limit(1);
        
        rlsTests[table] = {
          canRead: !testError,
          error: testError?.message,
        };
      }

    } catch (err) {
      farmsError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  // Check for session via cookies
  const cookieStore = await cookies();
  const authCookies = cookieStore.getAll().filter(c => 
    c.name.includes("supabase") || c.name.includes("sb-")
  );
  sessionExists = authCookies.length > 0;

  // Try to get user email from auth token cookie
  const authTokenCookie = authCookies.find(c => c.name.includes("auth-token"));
  if (authTokenCookie) {
    try {
      const decoded = JSON.parse(Buffer.from(authTokenCookie.value, "base64").toString());
      sessionEmail = decoded?.user?.email || null;
    } catch {
      // Ignore parse errors
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🔧 Debug Page</h1>
          <p className="mt-2 text-gray-600">Development diagnostics - not available in production</p>
        </div>

        {/* Supabase Connection */}
        <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Supabase Connection</h2>
          <dl className="space-y-3">
            <div className="flex items-start gap-3">
              <dt className="w-40 shrink-0 font-medium text-gray-600">URL:</dt>
              <dd className="font-mono text-sm break-all">
                {supabaseUrl}
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="w-40 shrink-0 font-medium text-gray-600">Anon Key:</dt>
              <dd className="font-mono text-sm">
                {supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}...` : "NOT SET"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Database Counts */}
        <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Database Counts</h2>
          
          {farmsError ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              <strong>Error:</strong> {farmsError}
            </div>
          ) : (
            <dl className="space-y-3">
              <div className="flex items-center gap-3">
                <dt className="w-40 shrink-0 font-medium text-gray-600">Approved Farms:</dt>
                <dd className={`text-2xl font-bold ${farmsCount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {farmsCount}
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="w-40 shrink-0 font-medium text-gray-600">Active Products:</dt>
                <dd className={`text-2xl font-bold ${productsCount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {productsCount}
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="w-40 shrink-0 font-medium text-gray-600">Orders (visible):</dt>
                <dd className="text-2xl font-bold text-gray-600">
                  {ordersCount}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Sample Farms */}
        <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Sample Farms (First 3)</h2>
          {sampleFarms.length > 0 ? (
            <ul className="space-y-2">
              {sampleFarms.map((farm) => (
                <li key={farm.slug} className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="font-medium">{farm.name}</span>
                  <span className="text-gray-400">/{farm.slug}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No approved farms found</p>
          )}
        </section>

        {/* Recent Orders */}
        <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Last 5 Orders (IDs only)</h2>
          {recentOrderIds.length > 0 ? (
            <ul className="space-y-1 font-mono text-sm">
              {recentOrderIds.map((id) => (
                <li key={id} className="text-gray-600">{id}...</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">
              {rlsTests.orders?.error ? `RLS blocked: ${rlsTests.orders.error}` : "No orders visible to anon user"}
            </p>
          )}
        </section>

        {/* RLS Test Results */}
        <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">RLS Test Results (Anon User)</h2>
          <div className="space-y-2">
            {Object.entries(rlsTests).map(([table, result]) => (
              <div key={table} className="flex items-center gap-3">
                <span className={result.canRead ? "text-green-500" : "text-red-500"}>
                  {result.canRead ? "✓" : "✗"}
                </span>
                <span className="font-medium">{table}</span>
                <span className="text-sm text-gray-500">
                  {result.canRead ? "readable" : result.error || "blocked"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Note: Some tables (orders, addresses, internal_notes) should be blocked for anonymous users
          </p>
        </section>

        {/* Session Status */}
        <section className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Session Status</h2>
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <dt className="w-40 shrink-0 font-medium text-gray-600">Session Exists:</dt>
              <dd className={`font-bold ${sessionExists ? "text-green-600" : "text-gray-600"}`}>
                {sessionExists ? "Yes" : "No (logged out)"}
              </dd>
            </div>
            {sessionEmail && (
              <div className="flex items-center gap-3">
                <dt className="w-40 shrink-0 font-medium text-gray-600">User Email:</dt>
                <dd className="font-mono text-sm">{sessionEmail}</dd>
              </div>
            )}
            <div className="flex items-center gap-3">
              <dt className="w-40 shrink-0 font-medium text-gray-600">Auth Cookies:</dt>
              <dd className="text-sm text-gray-600">
                {authCookies.length > 0 
                  ? authCookies.map(c => c.name).join(", ") 
                  : "None"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Quick Actions */}
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/health"
              target="_blank"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View /api/health JSON
            </a>
            <a
              href="/"
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Go to Homepage
            </a>
            <a
              href="/login"
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Go to Login
            </a>
            <a
              href="/admin"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Admin Dashboard
            </a>
          </div>
        </section>

        {/* Timestamp */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Generated at {new Date().toISOString()}
        </p>
      </div>
    </div>
  );
}
