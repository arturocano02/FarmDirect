/**
 * Role detection and authorization utilities
 * Handles admin email allowlist, profile roles, and user metadata
 */

import type { User } from "@supabase/supabase-js";

export type UserRole = "customer" | "farm" | "admin";

/**
 * Normalize email for comparison (lowercase, trimmed)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Get admin emails from environment variable
 * Format: ADMIN_EMAILS=email1@example.com,email2@example.com
 */
let cachedAdminEmails: Set<string> | null = null;

export function getAdminEmailsFromEnv(): Set<string> {
  if (cachedAdminEmails !== null) {
    return cachedAdminEmails;
  }

  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  const emails = adminEmailsEnv
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter((email) => email.length > 0 && email.includes("@"));

  cachedAdminEmails = new Set(emails);

  if (process.env.NODE_ENV === "development" && emails.length > 0) {
    console.log(`[roles] Loaded ${emails.length} admin email(s) from ADMIN_EMAILS`);
  }

  return cachedAdminEmails;
}

/**
 * Check if an email is in the admin allowlist
 */
export function isEmailAdminAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmailsFromEnv();
  return adminEmails.has(normalizeEmail(email));
}

/**
 * Get the admin claim keyword from environment
 * Default: FARMADMIN26
 */
export function getAdminKeyword(): string {
  return process.env.ADMIN_CLAIM_CODE || process.env.ADMIN_KEYWORD || "FARMADMIN26";
}

/**
 * Validate admin keyword
 */
export function isValidAdminKeyword(keyword: string): boolean {
  const expected = getAdminKeyword();
  return keyword === expected;
}

interface GetEffectiveRoleParams {
  sessionUser: User | null;
  profileRole?: string | null;
}

/**
 * Get effective role considering:
 * 1. Admin email allowlist (highest priority for admin)
 * 2. Profile role from database
 * 3. User metadata role
 * 4. Default to customer
 */
export function getEffectiveRole({
  sessionUser,
  profileRole,
}: GetEffectiveRoleParams): UserRole {
  // If user is in admin email allowlist, they are admin
  if (sessionUser?.email && isEmailAdminAllowlisted(sessionUser.email)) {
    return "admin";
  }

  // Check profile role (from database)
  if (profileRole && ["admin", "farm", "customer"].includes(profileRole)) {
    return profileRole as UserRole;
  }

  // Check user metadata role (from signup)
  const metadataRole = sessionUser?.user_metadata?.role;
  if (metadataRole && ["admin", "farm", "customer"].includes(metadataRole)) {
    return metadataRole as UserRole;
  }

  // Default to customer
  return "customer";
}

/**
 * Get home path for a role
 */
export function getHomePathForRole(role: UserRole | string | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "farm":
      return "/farm-portal";
    case "customer":
    default:
      return "/farms";
  }
}

/**
 * Clear the admin emails cache (useful for testing)
 */
export function clearAdminEmailsCache(): void {
  cachedAdminEmails = null;
}

/**
 * Log role detection in development mode
 */
export function logRoleDetection(
  context: string,
  data: {
    email?: string | null;
    profileRole?: string | null;
    metadataRole?: string | null;
    effectiveRole: string;
    isAllowlisted?: boolean;
    decision?: string;
  }
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[roles:${context}]`, {
      email: data.email ? `${data.email.substring(0, 3)}...` : null,
      profileRole: data.profileRole,
      metadataRole: data.metadataRole,
      effectiveRole: data.effectiveRole,
      isAllowlisted: data.isAllowlisted,
      decision: data.decision,
    });
  }
}
