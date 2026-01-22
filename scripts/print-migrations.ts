/**
 * Print Migrations Script
 * 
 * Outputs all SQL migrations in order, formatted for easy copy/paste
 * into the Supabase SQL Editor.
 * 
 * Usage:
 *   pnpm db:print-migrations
 *   pnpm db:print-migrations > migrations.sql
 */

import * as fs from "fs";
import * as path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

function printMigrations() {
  // Check if migrations directory exists
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error("❌ Migrations directory not found:", MIGRATIONS_DIR);
    process.exit(1);
  }

  // Get all .sql files sorted by name (which includes timestamp)
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("❌ No migration files found in:", MIGRATIONS_DIR);
    process.exit(1);
  }

  console.log("-- ============================================");
  console.log("-- FairFarm Database Migrations");
  console.log("-- ============================================");
  console.log("--");
  console.log("-- Instructions:");
  console.log("-- 1. Go to your Supabase project dashboard");
  console.log("-- 2. Navigate to SQL Editor");
  console.log("-- 3. Create a new query");
  console.log("-- 4. Paste this entire output");
  console.log("-- 5. Click 'Run' to execute");
  console.log("--");
  console.log("-- This script contains the following migrations:");
  files.forEach((f) => console.log(`--   - ${f}`));
  console.log("--");
  console.log("-- ============================================\n");

  // Output each migration with a clear separator
  files.forEach((file, index) => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    console.log("-- ============================================");
    console.log(`-- Migration ${index + 1}/${files.length}: ${file}`);
    console.log("-- ============================================\n");
    console.log(content);
    console.log("\n");
  });

  console.log("-- ============================================");
  console.log("-- End of migrations");
  console.log("-- ============================================");
  
  // Print to stderr so it doesn't interfere with piped output
  console.error(`\n✅ Printed ${files.length} migration(s)`);
  console.error("   Copy the output above and paste into Supabase SQL Editor\n");
}

printMigrations();
