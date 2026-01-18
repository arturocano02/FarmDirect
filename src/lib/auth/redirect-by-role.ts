/**
 * Utility to determine redirect path based on user role
 */

import type { UserRole } from "@/types/database";

/**
 * Get the appropriate home page for a user role
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
 * Get the appropriate dashboard label for a role
 */
export function getDashboardLabelForRole(role: UserRole | string | null | undefined): string {
  switch (role) {
    case "admin":
      return "Admin Console";
    case "farm":
      return "Seller Portal";
    case "customer":
    default:
      return "Marketplace";
  }
}
