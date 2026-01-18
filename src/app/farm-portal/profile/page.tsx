import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FarmProfileForm } from "./farm-profile-form";
import type { Farm } from "@/types/database";

export const metadata = {
  title: "Farm Profile",
  description: "Edit your farm profile",
};

export const dynamic = "force-dynamic";

export default async function FarmProfilePage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's farm
  const { data: farm } = await supabase
    .from("farms")
    .select("*")
    .eq("owner_user_id", user.id)
    .single();

  if (!farm) {
    redirect("/farm-portal/setup");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="section-heading">Farm Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Manage how your farm appears to customers
        </p>
      </div>

      <FarmProfileForm farm={farm as Farm} />
    </div>
  );
}
