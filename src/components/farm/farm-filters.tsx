"use client";

import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { formatBadge, getBadgeColorClass } from "@/lib/utils/badge-helpers";
import { cn } from "@/lib/utils";

interface FarmFiltersProps {
  allBadges: string[];
  selectedBadges: string[];
  onBadgesChange: (badges: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FarmFilters({
  allBadges,
  selectedBadges,
  onBadgesChange,
  searchQuery,
  onSearchChange,
}: FarmFiltersProps) {
  const [showAllBadges, setShowAllBadges] = useState(false);
  
  const displayedBadges = showAllBadges ? allBadges : allBadges.slice(0, 6);

  const toggleBadge = (badge: string) => {
    if (selectedBadges.includes(badge)) {
      onBadgesChange(selectedBadges.filter((b) => b !== badge));
    } else {
      onBadgesChange([...selectedBadges, badge]);
    }
  };

  const clearFilters = () => {
    onBadgesChange([]);
    onSearchChange("");
  };

  const hasActiveFilters = selectedBadges.length > 0 || searchQuery.length > 0;

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Enter your postcode or search farms..."
          className="w-full rounded-lg border bg-background pl-10 pr-10 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Badge filters */}
      {allBadges.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Filter by</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {displayedBadges.map((badge) => {
              const isSelected = selectedBadges.includes(badge);
              return (
                <button
                  key={badge}
                  onClick={() => toggleBadge(badge)}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    isSelected
                      ? getBadgeColorClass(badge) + " ring-2 ring-primary ring-offset-2"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {formatBadge(badge)}
                </button>
              );
            })}
            
            {allBadges.length > 6 && (
              <button
                onClick={() => setShowAllBadges(!showAllBadges)}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:underline"
              >
                {showAllBadges ? "Show less" : `+${allBadges.length - 6} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
