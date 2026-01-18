import "server-only";

/**
 * Simple in-memory rate limiter for server-side operations.
 * Used primarily for admin claim endpoint to prevent brute force attacks.
 * 
 * For production, consider using Redis or a persistent store.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

// In-memory storage for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const entries = Array.from(rateLimitStore.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, entry] = entries[i];
    if (now - entry.lastAttempt > windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of attempts allowed in the window */
  maxAttempts: number;
  /** Key prefix for namespacing different rate limiters */
  keyPrefix: string;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining attempts */
  remaining: number;
  /** Time in ms until the rate limit resets */
  resetIn: number;
  /** Total attempts made in current window */
  attempts: number;
}

/**
 * Check and update rate limit for a given key.
 * 
 * @param key - Unique identifier (e.g., IP address, email, combined)
 * @param config - Rate limiting configuration
 * @returns RateLimitResult indicating if request is allowed
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const fullKey = `${config.keyPrefix}:${key}`;
  const now = Date.now();

  // Run cleanup periodically
  cleanup(config.windowMs);

  const entry = rateLimitStore.get(fullKey);

  if (!entry) {
    // First attempt
    rateLimitStore.set(fullKey, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetIn: config.windowMs,
      attempts: 1,
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > config.windowMs) {
    // Reset the window
    rateLimitStore.set(fullKey, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetIn: config.windowMs,
      attempts: 1,
    };
  }

  // Window is still active
  const newCount = entry.count + 1;
  const resetIn = config.windowMs - (now - entry.firstAttempt);

  // Update entry
  rateLimitStore.set(fullKey, {
    ...entry,
    count: newCount,
    lastAttempt: now,
  });

  if (newCount > config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      attempts: newCount,
    };
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - newCount,
    resetIn,
    attempts: newCount,
  };
}

/**
 * Admin claim rate limit configuration.
 * Very restrictive to prevent brute force:
 * - 5 attempts per IP per 15 minutes
 * - 3 attempts per email per hour
 */
export const ADMIN_CLAIM_RATE_LIMITS = {
  perIp: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    keyPrefix: "admin-claim-ip",
  },
  perEmail: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    keyPrefix: "admin-claim-email",
  },
} as const;

/**
 * Check both IP and email rate limits for admin claim.
 * Both must pass for the request to be allowed.
 */
export function checkAdminClaimRateLimit(
  ip: string,
  email: string
): { allowed: boolean; message: string } {
  const ipResult = checkRateLimit(ip, ADMIN_CLAIM_RATE_LIMITS.perIp);
  const emailResult = checkRateLimit(
    email.toLowerCase().trim(),
    ADMIN_CLAIM_RATE_LIMITS.perEmail
  );

  if (!ipResult.allowed) {
    return {
      allowed: false,
      message: `Too many attempts. Please try again in ${Math.ceil(ipResult.resetIn / 60000)} minutes.`,
    };
  }

  if (!emailResult.allowed) {
    return {
      allowed: false,
      message: `Too many attempts for this email. Please try again in ${Math.ceil(emailResult.resetIn / 60000)} minutes.`,
    };
  }

  return { allowed: true, message: "OK" };
}

/**
 * Get client IP from request headers (works with Vercel and other proxies)
 */
export function getClientIp(request: Request): string {
  // Vercel and Cloudflare headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (client IP)
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Cloudflare specific
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback
  return "unknown";
}

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export function resetRateLimit(key: string, keyPrefix: string): void {
  rateLimitStore.delete(`${keyPrefix}:${key}`);
}
