import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FarmOnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Set Up Your Farm | Farmlink",
  description: "Complete your farm profile to start selling on Farmlink",
};

export default async function FarmOnboardingPage() {
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/farm-portal/onboarding");
  }

  // Check if user is a farm role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "farm") {
    redirect("/");
  }

  // Check if user already has a farm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingFarm } = await (supabase as any)
    .from("farms")
    .select("id, status")
    .eq("owner_user_id", user.id)
    .single();

  if (existingFarm) {
    // Farm exists, redirect to appropriate page
    redirect("/farm-portal");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <FarmOnboardingWizard userId={user.id} userEmail={user.email || ""} />
    </div>
  );
}
