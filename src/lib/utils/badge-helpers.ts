/**
 * Badge Helper Utilities
 * Client-safe functions for working with farm badges
 */

/**
 * Format badge for display
 */
export function formatBadge(badge: string): string {
  return badge
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get badge color class
 */
export function getBadgeColorClass(badge: string): string {
  const colors: Record<string, string> = {
    "grass-fed": "bg-emerald-100 text-emerald-800",
    "heritage-breed": "bg-amber-100 text-amber-800",
    "pasture-raised": "bg-lime-100 text-lime-800",
    "award-winning": "bg-yellow-100 text-yellow-800",
    "local-sourced": "bg-blue-100 text-blue-800",
    "dry-aged": "bg-purple-100 text-purple-800",
    "scottish": "bg-indigo-100 text-indigo-800",
    "native-breeds": "bg-orange-100 text-orange-800",
    "hill-reared": "bg-stone-100 text-stone-800",
    "free-range": "bg-green-100 text-green-800",
    "woodland-reared": "bg-teal-100 text-teal-800",
    "small-batch": "bg-rose-100 text-rose-800",
    "organic": "bg-emerald-100 text-emerald-800",
    "regenerative": "bg-cyan-100 text-cyan-800",
    "carbon-negative": "bg-sky-100 text-sky-800",
    "moorland-grazed": "bg-violet-100 text-violet-800",
    "salt-marsh": "bg-blue-100 text-blue-800",
    "traditional": "bg-amber-100 text-amber-800",
  };

  return colors[badge] || "bg-gray-100 text-gray-800";
}
