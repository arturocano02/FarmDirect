/**
 * Environment Variable Validation
 * 
 * This module provides access to environment variables with validation.
 * Validation only throws at runtime in the browser or server, not during build.
 */

/**
 * Check if we're in a build/prerender phase where env vars may not be available
 */
function isBuildPhase(): boolean {
  // During next build, NEXT_PHASE is set
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Get an environment variable with optional validation
 */
function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  
  // During build, return empty string for missing vars to allow static generation
  if (!value && isBuildPhase()) {
    return "";
  }
  
  if (!value && required) {
    throw new Error(
      `\n\n❌ Missing required environment variable: ${key}\n\n` +
      `To fix this:\n` +
      `1. Copy .env.example to .env.local\n` +
      `2. Fill in your Supabase project credentials from:\n` +
      `   https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n\n` +
      `Required variables:\n` +
      `  - NEXT_PUBLIC_SUPABASE_URL (Project URL)\n` +
      `  - NEXT_PUBLIC_SUPABASE_ANON_KEY (anon/public key)\n` +
      `  - SUPABASE_SERVICE_ROLE_KEY (service_role key - for server-side only)\n\n`
    );
  }
  
  return value || "";
}

/**
 * Client-side safe environment variables (NEXT_PUBLIC_*)
 * Access via getEnv() to ensure runtime validation
 */
export function getEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: getEnvVar("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", false),
    NEXT_PUBLIC_APP_URL: getEnvVar("NEXT_PUBLIC_APP_URL", false) || "http://localhost:3000",
  };
}

/**
 * Convenience export for common use case
 * Only use this in code paths that run at request time, not during build
 */
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY() {
    return getEnvVar("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", false);
  },
  get NEXT_PUBLIC_APP_URL() {
    return getEnvVar("NEXT_PUBLIC_APP_URL", false) || "http://localhost:3000";
  },
};

/**
 * Server-side only environment variables (never expose to client)
 */
export function getServerEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    STRIPE_SECRET_KEY: getEnvVar("STRIPE_SECRET_KEY", false),
    STRIPE_WEBHOOK_SECRET: getEnvVar("STRIPE_WEBHOOK_SECRET", false),
    RESEND_API_KEY: getEnvVar("RESEND_API_KEY", false),
    EMAIL_FROM: getEnvVar("EMAIL_FROM", false) || "orders@farmdirect.com",
    ADMIN_EMAIL: getEnvVar("ADMIN_EMAIL", false) || "admin@farmdirect.com",
  };
}

/**
 * Validate all required environment variables
 * Call this early in your app to get immediate feedback
 */
export function validateEnv(): void {
  if (isBuildPhase()) {
    console.log("⏭️  Skipping env validation during build");
    return;
  }
  
  // These will throw if missing
  getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  
  // Log success in development
  if (process.env.NODE_ENV === "development") {
    console.log("✅ Environment variables validated");
  }
}
