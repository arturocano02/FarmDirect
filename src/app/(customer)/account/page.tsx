import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { 
  User, 
  MapPin, 
  Package, 
  Heart,
  ChevronRight,
  Mail,
  Calendar
} from "lucide-react";
import { SignOutButton } from "./sign-out-button";

export const metadata = {
  title: "My Account | Farmlink",
  description: "Manage your Farmlink account",
};

export default async function AccountPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?redirect=/account");
  }

  // Get profile data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("name, role, created_at")
    .eq("id", user.id)
    .single();

  // Get address count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: addressCount } = await (supabase as any)
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get order count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: orderCount } = await (supabase as any)
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_user_id", user.id);

  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString("en-GB", { 
        month: "long", 
        year: "numeric" 
      })
    : "Recently";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-8">My Account</h1>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <div className="md:col-span-2 rounded-xl border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-farm-100 text-farm-700">
                <User className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold">
                  {profile?.name || "Customer"}
                </h2>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Member since {memberSince}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-medium text-sm text-muted-foreground mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Orders</span>
                <span className="font-semibold">{orderCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Addresses</span>
                <span className="font-semibold">{addressCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/orders"
            className="flex items-center justify-between rounded-xl border p-4 hover:border-farm-300 hover:bg-farm-50/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">My Orders</p>
                <p className="text-sm text-muted-foreground">View order history</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          <Link
            href="/account/addresses"
            className="flex items-center justify-between rounded-xl border p-4 hover:border-farm-300 hover:bg-farm-50/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-farm-100 text-farm-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Saved Addresses</p>
                <p className="text-sm text-muted-foreground">Manage delivery addresses</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/30 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Favorite Farms</p>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="mt-8 pt-6 border-t">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
