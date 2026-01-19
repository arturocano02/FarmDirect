import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FarmSetupWizard } from "@/components/farm-portal/setup-wizard";

export const metadata = {
  title: "Farm Setup | Farmlink",
  description: "Set up your farm profile on Farmlink",
};

export default async function FarmSetupPage() {
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/farm-portal/setup");
  }

  // Check if user is a farm role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Type assertion for profile
  const profileData = profile as { role: string } | null;

  if (!profileData || profileData.role !== "farm") {
    // Not a farm user, redirect based on role
    if (profileData?.role === "admin") {
      redirect("/admin");
    }
    redirect("/farms");
  }

  // Check if user already has a completed farm
  const { data: existingFarm } = await supabase
    .from("farms")
    .select("id, name, slug, short_description, story, address, postcode, postcode_rules, delivery_days, cutoff_time, min_order_value, delivery_fee, hero_image_url, logo_url, contact_email, status")
    .eq("owner_user_id", user.id)
    .single();

  // Type assertion for farm
  type ExistingFarmType = {
    id: string;
    name: string;
    slug: string;
    short_description: string | null;
    story: string | null;
    address: string | null;
    postcode: string | null;
    postcode_rules: string[] | null;
    delivery_days: string[] | null;
    cutoff_time: string | null;
    min_order_value: number | null;
    delivery_fee: number | null;
    hero_image_url: string | null;
    logo_url: string | null;
    contact_email: string | null;
    status: string;
  };

  const farmData = existingFarm as ExistingFarmType | null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white -m-6">
      <FarmSetupWizard 
        userId={user.id} 
        userEmail={user.email || ""} 
        existingFarm={farmData}
      />
    </div>
  );
}
