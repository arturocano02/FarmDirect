import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { 
  ShoppingBag, 
  LogOut,
  Store
} from "lucide-react";
import { FarmPortalNav } from "./farm-nav";

export default async function FarmPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?redirect=/farm-portal");
  }

  // Get farm info for the sidebar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: farm } = await (supabase as any)
    .from("farms")
    .select("id, name, status, slug")
    .eq("owner_user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-white md:block">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/farm-portal" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <Store className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <span className="font-display text-lg font-bold text-slate-900">
                Seller Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Farm name */}
        {farm && (
          <div className="border-b px-6 py-3">
            <p className="text-sm font-medium text-slate-900 truncate">{farm.name}</p>
            <div className="flex items-center gap-2 mt-1">
              {farm.status === "approved" ? (
                <span className="inline-flex items-center rounded-full bg-farm-100 px-2 py-0.5 text-xs font-medium text-farm-700">
                  Live
                </span>
              ) : farm.status === "pending" ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Pending Review
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {farm.status}
                </span>
              )}
            </div>
          </div>
        )}

        <FarmPortalNav farmSlug={farm?.slug} />

        <div className="absolute bottom-0 left-0 right-0 border-t p-4 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Marketplace
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 md:hidden">
        <Link href="/farm-portal" className="flex items-center gap-2">
          <Store className="h-5 w-5 text-amber-600" />
          <span className="font-display text-lg font-bold">Seller Portal</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="md:pl-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
