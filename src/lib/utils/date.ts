/**
 * Date formatting utilities
 */

type DateInput = string | Date;

function toDate(input: DateInput): Date {
  return typeof input === "string" ? new Date(input) : input;
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatDistanceToNow(input: DateInput): string {
  const date = toDate(input);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "just now";
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"}`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? "hour" : "hours"}`;
  } else if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? "day" : "days"}`;
  } else {
    return formatDate(input);
  }
}

/**
 * Format a date as a readable string (e.g., "Jan 15, 2024")
 */
export function formatDate(input: DateInput): string {
  const date = toDate(input);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date with time (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export function formatDateTime(input: DateInput): string {
  const date = toDate(input);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
