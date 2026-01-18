import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

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
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Get user role from metadata or profile
  let role = user.user_metadata?.role;
  
  if (!role) {
    // Fetch from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role || "customer";
  }

  // Check customer routes - only customers and admins allowed
  const isCustomerRoute = CUSTOMER_ROUTES.some(route => pathname.startsWith(route));
  if (isCustomerRoute && role === "farm") {
    // Farms cannot access customer-only routes
    const redirectUrl = new URL("/farm-portal", request.url);
    redirectUrl.searchParams.set("message", "Please use the marketplace to browse as a customer");
    return NextResponse.redirect(redirectUrl);
  }

  // Check farm routes - only farms and admins allowed
  const isFarmRoute = FARM_ROUTES.some(route => pathname.startsWith(route));
  if (isFarmRoute && role === "customer") {
    // Customers cannot access farm routes
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("message", "This area is for farm sellers only");
    return NextResponse.redirect(redirectUrl);
  }

  // Check admin routes - only admins allowed
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  if (isAdminRoute && role !== "admin") {
    // Non-admins cannot access admin routes
    const redirectUrl = new URL(role === "farm" ? "/farm-portal" : "/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Farm users accessing farm-portal: check if they need onboarding
  if (isFarmRoute && role === "farm" && !pathname.includes("/onboarding")) {
    const { data: farm } = await supabase
      .from("farms")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!farm) {
      // No farm exists, redirect to onboarding
      return NextResponse.redirect(new URL("/farm-portal/onboarding", request.url));
    }
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
