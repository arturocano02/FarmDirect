/**
 * Server-only utility for admin email allowlist management
 * ADMIN_EMAILS env var format: comma-separated emails
 * e.g., ADMIN_EMAILS=admin@example.com,superadmin@example.com
 */

let cachedAdminEmails: Set<string> | null = null;

/**
 * Parse and cache the ADMIN_EMAILS environment variable
 * Returns a Set of normalized (lowercase, trimmed) email addresses
 */
export function getAdminEmails(): Set<string> {
  if (cachedAdminEmails) {
    return cachedAdminEmails;
  }

  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  
  const emails = adminEmailsEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0 && email.includes("@"));

  cachedAdminEmails = new Set(emails);
  
  if (process.env.NODE_ENV === "development" && emails.length > 0) {
    console.log(`[admin-emails] Loaded ${emails.length} admin email(s) from ADMIN_EMAILS`);
  }

  return cachedAdminEmails;
}

/**
 * Check if an email is in the admin allowlist
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.has(email.trim().toLowerCase());
}

/**
 * Clear the cache (useful for testing)
 */
export function clearAdminEmailsCache(): void {
  cachedAdminEmails = null;
}
