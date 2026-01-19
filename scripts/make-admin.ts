/**
 * Script to promote a user to admin role
 * Usage: pnpm make-admin user@example.com
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing required environment variables:");
  if (!supabaseUrl) console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nMake sure these are set in your .env.local file.");
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error("❌ Usage: pnpm make-admin <email>");
  console.error("   Example: pnpm make-admin admin@example.com");
  process.exit(1);
}

if (!email.includes("@")) {
  console.error("❌ Invalid email address:", email);
  process.exit(1);
}

async function makeAdmin() {
  console.log(`\n🔐 Promoting user to admin: ${email}\n`);

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // First, find the user by email in auth.users
  console.log("1. Looking up user in auth.users...");
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("❌ Error listing users:", authError.message);
    process.exit(1);
  }

  const user = authUsers.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    console.log("\nNote: The user must have signed up before they can be promoted.");
    console.log("If they haven't signed up yet, they should:");
    console.log("1. Go to /signup and create an account");
    console.log("2. Then run this script again");
    process.exit(1);
  }

  console.log(`   ✓ Found user: ${user.id.substring(0, 8)}...`);

  // Check current profile
  console.log("2. Checking current profile...");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, name")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("❌ Error fetching profile:", profileError.message);
    process.exit(1);
  }

  if (profile) {
    console.log(`   ✓ Current role: ${profile.role}`);
    
    if (profile.role === "admin") {
      console.log("\n✅ User is already an admin!");
      process.exit(0);
    }
  } else {
    console.log("   ⚠ No profile found, will create one");
  }

  // Update or insert profile with admin role
  console.log("3. Setting role to admin...");

  if (profile) {
    // Update existing profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id);

    if (updateError) {
      console.error("❌ Error updating profile:", updateError.message);
      process.exit(1);
    }
  } else {
    // Insert new profile
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        role: "admin",
        name: user.user_metadata?.name || email.split("@")[0],
      });

    if (insertError) {
      console.error("❌ Error creating profile:", insertError.message);
      process.exit(1);
    }
  }

  console.log("   ✓ Role updated to admin");

  // Also update user metadata for consistency
  console.log("4. Updating user metadata...");
  const { error: metadataError } = await supabase.auth.admin.updateUserById(
    user.id,
    { user_metadata: { ...user.user_metadata, role: "admin" } }
  );

  if (metadataError) {
    console.warn("   ⚠ Could not update user metadata:", metadataError.message);
    console.log("   (This is not critical, profile role takes precedence)");
  } else {
    console.log("   ✓ User metadata updated");
  }

  console.log("\n✅ Success! User is now an admin.");
  console.log(`\nNext steps for ${email}:`);
  console.log("1. Log in at /login");
  console.log("2. You'll be redirected to /admin");
  console.log("3. Or navigate directly to /admin\n");
}

makeAdmin().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
