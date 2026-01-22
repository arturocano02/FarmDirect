/**
 * FairFarm Sanity Check Script
 *
 * Verifies database state by checking counts of approved farms and active products.
 * Exits with code 1 if farms count is 0 (indicating a problem).
 *
 * Usage:
 *   pnpm db:sanity
 *
 * Requirements:
 *   - .env.local with:
 *     - NEXT_PUBLIC_SUPABASE_URL
 *     - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment
if (!supabaseUrl) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function sanityCheck() {
  console.log("\n🔍 FairFarm Database Sanity Check\n");
  console.log("=".repeat(50));
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log("=".repeat(50));

  try {
    // Check approved farms count
    const { count: farmsCount, error: farmsError } = await supabase
      .from("farms")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    if (farmsError) {
      console.error("\n❌ Error querying farms:", farmsError.message);
      console.log("\n   This might mean:");
      console.log("   - Migrations have not been applied");
      console.log("   - Database connection issue");
      console.log("\n   Run: pnpm db:print-migrations");
      console.log("   Then paste output into Supabase SQL Editor");
      process.exit(1);
    }

    // Check active products count
    const { count: productsCount, error: productsError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (productsError) {
      console.error("\n❌ Error querying products:", productsError.message);
      process.exit(1);
    }

    // Check profiles count (to diagnose FK issues)
    const { count: profilesCount, error: profilesError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Display results
    console.log("\n📊 Database Counts:\n");
    console.log(`   Approved farms:  ${farmsCount ?? 0}`);
    console.log(`   Active products: ${productsCount ?? 0}`);
    console.log(`   Profiles:        ${profilesCount ?? 0}${profilesError ? ' (error)' : ''}`);

    // Sample a few farms to show they exist
    if (farmsCount && farmsCount > 0) {
      const { data: sampleFarms } = await supabase
        .from("farms")
        .select("name, slug, status, hero_image_url")
        .eq("status", "approved")
        .limit(5);

      if (sampleFarms && sampleFarms.length > 0) {
        console.log("\n📋 Sample approved farms:");
        for (const farm of sampleFarms) {
          const hasImage = farm.hero_image_url ? "✅" : "❌";
          console.log(`   ${hasImage} ${farm.name} (/${farm.slug})`);
        }
      }
    }

    // Final verdict
    console.log("\n" + "=".repeat(50));

    if (!farmsCount || farmsCount === 0) {
      console.log("\n❌ SANITY CHECK FAILED: No approved farms found!\n");
      console.log("   Next steps:");
      console.log("   1. Ensure migrations are applied (pnpm db:print-migrations)");
      console.log("   2. Run seed script (pnpm db:seed)");
      console.log("   3. Re-run this check (pnpm db:sanity)\n");
      process.exit(1);
    }

    if (!productsCount || productsCount === 0) {
      console.log("\n⚠️  WARNING: No active products found!");
      console.log("   Farms exist but have no products.");
      console.log("   Re-run: pnpm db:seed\n");
      process.exit(1);
    }

    console.log("\n✅ SANITY CHECK PASSED!\n");
    console.log(`   ${farmsCount} farms with ${productsCount} products ready.`);
    console.log("\n   Next: pnpm dev\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Run
sanityCheck();
