import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { FarmFeed, FarmFeedSkeleton } from "@/components/farm/farm-feed";
import { getApprovedFarms, getAllBadges } from "@/lib/data/farms";

export const metadata = {
  title: "Browse Farms",
  description: "Discover trusted local farms and their premium meat products",
};

export const revalidate = 60; // ISR: revalidate every 60 seconds
export const dynamic = "force-dynamic"; // Ensure fresh data on each request

async function FarmListSection() {
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
    console.error("[/farms] Error loading farms:", err);
  }

  // Dev-only debug info
  if (process.env.NODE_ENV === "development") {
    console.log("[/farms] Rendering with:", {
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
          Check the server console for details. Visit{" "}
          <a href="/api/health/public-farms" className="underline">/api/health/public-farms</a> for diagnostics.
        </p>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
        <div className="mx-auto h-12 w-12 text-4xl">🌾</div>
        <h3 className="mt-4 font-display text-lg font-semibold text-amber-900">
          No farms available yet
        </h3>
        <p className="mt-2 text-sm text-amber-700">
          Check back soon! Farms are being added regularly.
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="mt-4 text-xs text-amber-600">
            Dev tip: Run <code className="bg-amber-100 px-1 rounded">pnpm db:seed</code> to add sample farms.
          </p>
        )}
      </div>
    );
  }

  return <FarmFeed farms={farms} allBadges={allBadges} />;
}

export default function FarmsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="section-heading">Browse Farms</h1>
        <p className="mt-2 text-muted-foreground">
          Discover trusted local farms and their premium meat products
        </p>
      </div>

      <Suspense fallback={<FarmFeedSkeleton />}>
        <FarmListSection />
      </Suspense>
    </div>
  );
}
