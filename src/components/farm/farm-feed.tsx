"use client";

import { useState, useMemo } from "react";
import { FarmCard, FarmCardSkeleton } from "@/components/farm/farm-card";
import { FarmFilters } from "@/components/farm/farm-filters";
import type { Farm } from "@/types/database";

interface FarmWithProductCount extends Farm {
  product_count?: number;
}

interface FarmFeedProps {
  farms: FarmWithProductCount[];
  allBadges: string[];
}

export function FarmFeed({ farms, allBadges }: FarmFeedProps) {
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFarms = useMemo(() => {
    let result = farms;

    // Filter by badges
    if (selectedBadges.length > 0) {
      result = result.filter((farm) =>
        selectedBadges.some((badge) => farm.badges?.includes(badge))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (farm) =>
          farm.name.toLowerCase().includes(query) ||
          farm.short_description?.toLowerCase().includes(query) ||
          farm.postcode?.toLowerCase().startsWith(query) ||
          farm.postcode_rules?.some((rule) =>
            rule.toLowerCase().startsWith(query)
          )
      );
    }

    return result;
  }, [farms, selectedBadges, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <FarmFilters
        allBadges={allBadges}
        selectedBadges={selectedBadges}
        onBadgesChange={setSelectedBadges}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredFarms.length === farms.length
            ? `${farms.length} farms`
            : `${filteredFarms.length} of ${farms.length} farms`}
        </p>
      </div>

      {/* Farm grid */}
      {filteredFarms.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFarms.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      ) : (
        <EmptyState
          hasFilters={selectedBadges.length > 0 || searchQuery.length > 0}
          onClearFilters={() => {
            setSelectedBadges([]);
            setSearchQuery("");
          }}
        />
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <span className="text-3xl">🔍</span>
      </div>
      <h3 className="font-display text-lg font-semibold mb-2">
        {hasFilters ? "No farms match your filters" : "No farms available"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {hasFilters
          ? "Try adjusting your filters or search query to find farms."
          : "Check back soon as new farms are added regularly."}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="text-sm text-primary hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// Loading state
export function FarmFeedSkeleton() {
  return (
    <div className="space-y-8">
      {/* Filter skeleton */}
      <div className="space-y-4">
        <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <FarmCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
