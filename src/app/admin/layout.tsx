import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

export const metadata = {
  title: {
    template: "%s | Admin Console",
    default: "Admin Console",
  },
  description: "FairFarm Admin Console",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Get current user and verify admin role
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Check admin role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || "customer";
  
  if (role !== "admin") {
    redirect("/farms");
  }

  const adminUser = {
    email: user.email || "",
    name: profile?.name || user.user_metadata?.name || "Admin",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar - desktop */}
      <AdminSidebar />
      
      {/* Main area */}
      <div className="md:pl-64">
        {/* Header */}
        <AdminHeader user={adminUser} />
        
        {/* Main content */}
        <main className="p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
