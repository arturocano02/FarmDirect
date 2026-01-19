import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { 
  getEffectiveRole, 
  isEmailAdminAllowlisted, 
  getHomePathForRole,
  logRoleDetection,
} from "@/lib/auth/roles";

// Routes that require authentication
const CUSTOMER_ROUTES = [
  "/account",
  "/orders",
  "/checkout",
];

const FARM_ROUTES = [
  "/farm-portal",
];

const ADMIN_ROUTES = [
  "/admin",
];

// Routes that are always public (accessible without login)
const PUBLIC_ROUTES = [
  "/",
  "/farms",
  "/farm/",  // /farm/[slug] - individual farm pages
  "/cart",   // Cart is public (uses local storage)
  "/sell",
  "/login",
  "/signup",
  "/forgot-password",
  "/auth",
  "/api",
  "/debug",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // First, update the session
  const response = await updateSession(request);

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return response;
  }

  // For protected routes, check authentication and role
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If no user and route requires auth, redirect to login
  if (!user) {
    const isProtected = 
      CUSTOMER_ROUTES.some(route => pathname.startsWith(route)) ||
      FARM_ROUTES.some(route => pathname.startsWith(route)) ||
      ADMIN_ROUTES.some(route => pathname.startsWith(route));

    if (isProtected) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[middleware] Unauthenticated access to ${pathname}, redirecting to login`);
      }
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Fetch profile role from database
  let profileRole: string | null = null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    // Log error but continue with metadata role
    console.error("[middleware] Error fetching profile:", profileError);
  } else if (profile) {
    profileRole = (profile as { role: string }).role;
  }

  // Get effective role using the new utility
  const metadataRole = user.user_metadata?.role;
  const isAllowlisted = isEmailAdminAllowlisted(user.email);
  const effectiveRole = getEffectiveRole({
    sessionUser: user,
    profileRole,
  });

  // Log role detection in development
  logRoleDetection("middleware", {
    email: user.email,
    profileRole,
    metadataRole,
    effectiveRole,
    isAllowlisted,
    decision: `Checking route: ${pathname}`,
  });

  // Check route access based on effective role
  const isCustomerRoute = CUSTOMER_ROUTES.some(route => pathname.startsWith(route));
  const isFarmRoute = FARM_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  // Admin can access everything
  if (effectiveRole === "admin") {
    // Admin accessing admin routes - allow
    if (isAdminRoute) {
      return response;
    }
    // Admin can also access customer/farm routes if needed
    return response;
  }

  // Non-admin trying to access admin routes
  if (isAdminRoute) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[middleware] Non-admin (${effectiveRole}) blocked from /admin, redirecting`);
    }
    const redirectPath = getHomePathForRole(effectiveRole);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Farm user accessing farm portal
  if (effectiveRole === "farm") {
    if (isCustomerRoute) {
      // Farms cannot access customer-only routes
      return NextResponse.redirect(new URL("/farm-portal", request.url));
    }
    
    // Check if farm user needs setup
    if (isFarmRoute && !pathname.includes("/setup") && !pathname.includes("/onboarding")) {
      const { data: farm } = await supabase
        .from("farms")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();

      if (!farm) {
        return NextResponse.redirect(new URL("/farm-portal/setup", request.url));
      }
    }
    return response;
  }

  // Customer role
  if (effectiveRole === "customer") {
    if (isFarmRoute) {
      // Customers cannot access farm routes
      return NextResponse.redirect(new URL("/farms", request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
