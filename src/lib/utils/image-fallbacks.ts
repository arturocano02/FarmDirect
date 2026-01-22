const FARM_HERO_FALLBACK = "/images/fallbacks/farm-hero.svg";
const FARM_LOGO_FALLBACK = "/images/fallbacks/farm-logo.svg";
const PRODUCT_DEFAULT_FALLBACK = "/images/fallbacks/product-default.svg";

const PRODUCT_FALLBACKS: Array<{ keywords: string[]; src: string }> = [
  {
    keywords: ["beef", "steak", "burger", "brisket", "mince", "ribeye", "sirloin", "fillet", "roast", "joint", "veal"],
    src: "/images/fallbacks/product-meat.svg",
  },
  {
    keywords: ["pork", "bacon", "ham", "sausage", "belly", "chop", "rind"],
    src: "/images/fallbacks/product-pork.svg",
  },
  {
    keywords: ["lamb", "mutton", "hogget"],
    src: "/images/fallbacks/product-lamb.svg",
  },
  {
    keywords: ["chicken", "poultry", "duck", "turkey"],
    src: "/images/fallbacks/product-poultry.svg",
  },
  {
    keywords: ["fish", "salmon", "trout", "cod", "haddock", "mackerel", "seafood", "prawn", "shrimp", "crab"],
    src: "/images/fallbacks/product-fish.svg",
  },
  {
    keywords: ["milk", "cheese", "butter", "yogurt", "cream", "dairy"],
    src: "/images/fallbacks/product-dairy.svg",
  },
  {
    keywords: ["egg", "eggs"],
    src: "/images/fallbacks/product-eggs.svg",
  },
  {
    keywords: ["bread", "bakery", "cake", "pastry", "bun", "loaf", "bake"],
    src: "/images/fallbacks/product-bakery.svg",
  },
  {
    keywords: ["honey", "jam", "preserve", "sauce", "oil", "vinegar", "spice", "herb", "tea", "coffee", "cider", "wine", "beer", "juice", "drink", "ale"],
    src: "/images/fallbacks/product-pantry.svg",
  },
  {
    keywords: ["apple", "pear", "berry", "fruit", "veg", "vegetable", "carrot", "potato", "onion", "tomato", "lettuce", "greens", "salad"],
    src: "/images/fallbacks/product-produce.svg",
  },
];

function normalizeName(name?: string | null): string {
  return (name || "").toLowerCase();
}

export function getProductFallbackImage(name?: string | null): string {
  const haystack = normalizeName(name);
  if (!haystack) {
    return PRODUCT_DEFAULT_FALLBACK;
  }

  for (const fallback of PRODUCT_FALLBACKS) {
    if (fallback.keywords.some((keyword) => haystack.includes(keyword))) {
      return fallback.src;
    }
  }

  return PRODUCT_DEFAULT_FALLBACK;
}

export function getFarmFallbackImage(): string {
  return FARM_HERO_FALLBACK;
}

export function getFarmLogoFallbackImage(): string {
  return FARM_LOGO_FALLBACK;
}
