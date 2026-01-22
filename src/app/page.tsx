import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MapPin, Truck, Shield, ArrowRight, AlertTriangle } from "lucide-react";
import { FarmFeed, FarmFeedSkeleton } from "@/components/farm/farm-feed";
import { getApprovedFarms, getAllBadges } from "@/lib/data/farms";
import { createClient } from "@/lib/supabase/server";
import { getHomePathForRole } from "@/lib/auth/redirect-by-role";

export const revalidate = 60; // ISR: revalidate every 60 seconds
export const dynamic = "force-dynamic"; // Ensure fresh data on each request

async function FarmSection() {
  let farms: Awaited<ReturnType<typeof getApprovedFarms>> = [];
  let allBadges: string[] = [];
  let error: string | null = null;

  try {
    [farms, allBadges] = await Promise.all([
      getApprovedFarms(),
      getAllBadges(),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load farms";
    console.error("[homepage] Error loading farms:", err);
  }

  // Dev-only debug info
  if (process.env.NODE_ENV === "development") {
    console.log("[homepage] Rendering with:", {
      farmCount: farms.length,
      badgeCount: allBadges.length,
      error,
    });
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 font-display text-lg font-semibold text-red-900">
          Unable to load farms
        </h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <p className="mt-4 text-xs text-red-600">
          Check the server console for details. In development, visit{" "}
          <a href="/debug" className="underline">/debug</a> or{" "}
          <a href="/api/health" className="underline">/api/health</a> for diagnostics.
        </p>
      </div>
    );
  }

  return <FarmFeed farms={farms} allBadges={allBadges} />;
}

export default async function HomePage() {
  // Check if user is authenticated and redirect based on role
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Get user role from profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.user_metadata?.role || "customer";
    const redirectPath = getHomePathForRole(role);
    redirect(redirectPath);
  }

  // Show landing page for logged-out users
  return (
    <div className="min-h-screen bg-gradient-to-b from-earth-50 to-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-farm-700">
              FairFarm
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#farms"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Farms
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Premium Meat,{" "}
              <span className="text-farm-600">Straight from the Farm</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Discover trusted local farms, browse their finest cuts, and get
              exceptional quality meat delivered to your door. No middlemen, no
              compromises.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="#farms"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Browse Farms
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?role=farm"
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                Sell Your Meat
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-12 border-t bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-farm-100 text-farm-700">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                Trusted Farms
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every farm is vetted for quality, animal welfare, and
                sustainable practices.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-farm-100 text-farm-700">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                Direct Delivery
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                From farm to your door. Properly chilled and packed for
                freshness.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-farm-100 text-farm-700">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                Know Your Source
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Full transparency on where your food comes from and how
                it&apos;s raised.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Farm Feed */}
      <section id="farms" className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="section-heading">Browse Farms</h2>
            <p className="mt-2 text-muted-foreground">
              Discover quality farms delivering to your area
            </p>
          </div>

          <Suspense fallback={<FarmFeedSkeleton />}>
            <FarmSection />
          </Suspense>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="font-display text-lg font-bold text-farm-700">
                FairFarm
              </span>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} All rights reserved.
              </p>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/signup?role=farm"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sell on FairFarm
              </Link>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              {process.env.NODE_ENV === "development" && (
                <Link
                  href="/debug"
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Debug
                </Link>
              )}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
