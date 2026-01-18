"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBadge, getBadgeColorClass } from "@/lib/utils/badge-helpers";
import type { Farm } from "@/types/database";

interface FarmCardProps {
  farm: Farm & { product_count?: number };
}

export function FarmCard({ farm }: FarmCardProps) {
  return (
    <Link href={`/farm/${farm.slug}`} className="group">
      <article className="farm-card overflow-hidden">
        {/* Hero Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {farm.hero_image_url ? (
            <Image
              src={farm.hero_image_url}
              alt={farm.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-earth-100 to-farm-100">
              <span className="text-4xl">🌾</span>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Farm name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-display text-xl font-semibold text-white drop-shadow-md">
              {farm.name}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Tagline */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {farm.short_description || "Quality meat from our farm to your table."}
          </p>

          {/* Badges */}
          {farm.badges && farm.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {farm.badges.slice(0, 3).map((badge) => (
                <Badge
                  key={badge}
                  className={getBadgeColorClass(badge)}
                >
                  {formatBadge(badge)}
                </Badge>
              ))}
            </div>
          )}

          {/* Delivery info */}
          <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
            {farm.delivery_days && farm.delivery_days.length > 0 && (
              <div className="flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" />
                <span>{formatDeliveryDays(farm.delivery_days)}</span>
              </div>
            )}
            {farm.postcode && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{farm.postcode.split(" ")[0]}</span>
              </div>
            )}
          </div>

          {/* Min order */}
          {farm.min_order_value && (
            <p className="text-xs text-muted-foreground">
              Min. order: £{(farm.min_order_value / 100).toFixed(2)}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

function formatDeliveryDays(days: string[]): string {
  if (days.length === 1) return days[0];
  if (days.length === 2) return days.join(" & ");
  return `${days.length} days/week`;
}

// Loading skeleton
export function FarmCardSkeleton() {
  return (
    <div className="farm-card overflow-hidden">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
