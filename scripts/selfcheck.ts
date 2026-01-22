/**
 * Self-check script for FairFarm
 * Verifies environment, database connection, and basic data integrity
 *
 * Run with: pnpm selfcheck
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local first, then .env as fallback
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const OPTIONAL_ENV_VARS = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "ADMIN_EMAIL",
  "ADMIN_EMAILS",
  "ADMIN_CLAIM_CODE",
  "NEXT_PUBLIC_APP_URL",
];

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${message}`);
}

function warn(name: string, message: string) {
  results.push({ name, passed: true, message: `⚠️ ${message}` });
  console.log(`⚠️  ${name}: ${message}`);
}

async function main() {
  console.log("\n🔍 FairFarm Self-Check\n");
  console.log("=".repeat(50));

  // 1. Check required environment variables
  console.log("\n📋 Environment Variables\n");
  
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      check(envVar, true, `Set (${value.slice(0, 20)}...)`);
    } else {
      check(envVar, false, "NOT SET - required!");
    }
  }

  // Check optional env vars
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      if (envVar === "ADMIN_EMAILS") {
        const emails = value.split(",").map(e => e.trim()).filter(e => e.includes("@"));
        check(envVar, true, `Set (${emails.length} admin email${emails.length !== 1 ? "s" : ""})`);
      } else if (envVar === "ADMIN_CLAIM_CODE") {
        // Don't reveal the actual code in logs
        check(envVar, true, `Set (${value.length} characters)`);
      } else {
        check(envVar, true, `Set (${value.slice(0, 20)}...)`);
      }
    } else {
      if (envVar === "ADMIN_EMAILS") {
        warn(envVar, "Not set - admin promotion via allowlist disabled");
      } else if (envVar === "ADMIN_CLAIM_CODE") {
        warn(envVar, "Not set - discreet admin signup disabled");
      } else {
        warn(envVar, "Not set (optional)");
      }
    }
  }

  // 2. Check /api/health endpoint (if server is running)
  console.log("\n🌐 API Health Check\n");
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  try {
    const response = await fetch(`${appUrl}/api/health`, {
      headers: { "Accept": "application/json" },
    });
    
    if (response.ok) {
      const data = await response.json();
      check("/api/health", data.ok, `Response OK`);
      check("Approved Farms", data.approvedFarmsCount > 0, `Count: ${data.approvedFarmsCount}`);
      check("Active Products", data.activeProductsCount > 0, `Count: ${data.activeProductsCount}`);
      
      // Check Phase D tables
      if (data.tables) {
        check("addresses table", data.tables.addresses, data.tables.addresses ? "Exists" : "Not found");
        check("email_outbox table", data.tables.email_outbox, data.tables.email_outbox ? "Exists" : "Not found");
      }
    } else {
      check("/api/health", false, `HTTP ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      warn("/api/health", "Server not running - skipping HTTP checks");
    } else {
      check("/api/health", false, message);
    }
  }

  // 3. Direct database check using service role
  console.log("\n🗄️  Database Check\n");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && serviceRoleKey) {
    try {
      // Import supabase client dynamically
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      
      // Check farms
      const { count: farmsCount, error: farmsError } = await supabase
        .from("farms")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");
      
      if (farmsError) {
        check("farms table", false, farmsError.message);
      } else {
        check("farms table", true, `${farmsCount} approved farms`);
      }
      
      // Check products
      const { count: productsCount, error: productsError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      if (productsError) {
        check("products table", false, productsError.message);
      } else {
        check("products table", true, `${productsCount} active products`);
      }
      
      // Check Phase D tables
      const { error: addressesError } = await supabase
        .from("addresses")
        .select("id", { head: true })
        .limit(1);
      check("addresses table", !addressesError, addressesError ? addressesError.message : "OK");
      
      const { error: emailOutboxError } = await supabase
        .from("email_outbox")
        .select("id", { head: true })
        .limit(1);
      check("email_outbox table", !emailOutboxError, emailOutboxError ? emailOutboxError.message : "OK");
      
      // Check orders (should exist but may be empty)
      const { count: ordersCount, error: ordersError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      
      if (ordersError) {
        check("orders table", false, ordersError.message);
      } else {
        check("orders table", true, `${ordersCount} orders`);
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      check("Database connection", false, message);
    }
  } else {
    warn("Database check", "Skipped - missing credentials");
  }

  // 4. Summary
  console.log("\n" + "=".repeat(50));
  console.log("\n📊 Summary\n");
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log("\n⚠️  Some checks failed. Please review the errors above.\n");
    process.exit(1);
  } else {
    console.log("\n✨ All checks passed!\n");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
