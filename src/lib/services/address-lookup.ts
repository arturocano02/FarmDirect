/**
 * Address Lookup Service
 * Uses postcodes.io (free, UK) and Nominatim (OSM) for address lookups
 * Includes rate limiting and caching for Nominatim
 */

// Simple in-memory cache for address lookups
const addressCache = new Map<string, { data: AddressLookupResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

// Rate limiting for Nominatim (max 1 request per second per IP)
const lastRequestTime = new Map<string, number>();
const MIN_REQUEST_INTERVAL_MS = 1000;

export interface PostcodeLookupResult {
  postcode: string;
  country: string;
  region: string;
  admin_district: string; // City/Borough
  admin_county: string | null;
  latitude: number;
  longitude: number;
}

export interface AddressLookupResult {
  display_name: string;
  line1: string;
  line2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * Look up a UK postcode using postcodes.io (free, no API key required)
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeLookupResult | null> {
  const normalizedPostcode = postcode.replace(/\s+/g, "").toUpperCase();
  
  if (process.env.NODE_ENV === "development") {
    console.log(`[address-lookup] Looking up postcode: ${normalizedPostcode}`);
  }
  
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalizedPostcode)}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Postcode not found
      }
      throw new Error(`Postcodes.io error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 200 || !data.result) {
      return null;
    }
    
    const result = data.result;
    
    return {
      postcode: result.postcode,
      country: result.country,
      region: result.region || result.admin_district,
      admin_district: result.admin_district,
      admin_county: result.admin_county,
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch (error) {
    console.error("[address-lookup] Postcode lookup error:", error);
    return null;
  }
}

/**
 * Search for addresses using Nominatim (OpenStreetMap)
 * Includes rate limiting (1 req/sec) and caching
 */
export async function searchAddress(
  query: string,
  clientIp: string = "default"
): Promise<AddressLookupResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `nominatim:${normalizedQuery}`;
  
  // Check cache
  const cached = addressCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[address-lookup] Cache hit for: ${normalizedQuery}`);
    }
    return cached.data ? [cached.data] : [];
  }
  
  // Rate limiting
  const lastRequest = lastRequestTime.get(clientIp) || 0;
  const timeSinceLastRequest = Date.now() - lastRequest;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime.set(clientIp, Date.now());
  
  if (process.env.NODE_ENV === "development") {
    console.log(`[address-lookup] Searching Nominatim for: ${normalizedQuery}`);
  }
  
  try {
    // Nominatim requires a valid User-Agent
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        countrycodes: "gb", // UK only
        limit: "5",
      }),
      {
        headers: {
          "User-Agent": "FairFarm/1.0 (contact@FairFarm.uk)",
          "Accept": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const results: AddressLookupResult[] = data.map((item: NominatimResult) => {
      const addr = item.address || {};
      
      return {
        display_name: item.display_name,
        line1: [addr.house_number, addr.road].filter(Boolean).join(" ") || 
               addr.neighbourhood || 
               addr.suburb || 
               "",
        line2: addr.neighbourhood || addr.suburb || null,
        city: addr.city || addr.town || addr.village || addr.hamlet || "",
        county: addr.county || addr.state_district || null,
        postcode: addr.postcode || "",
        country: addr.country || "United Kingdom",
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });
    
    // Cache the first result
    if (results.length > 0) {
      addressCache.set(cacheKey, { data: results[0], timestamp: Date.now() });
    }
    
    return results;
  } catch (error) {
    console.error("[address-lookup] Nominatim search error:", error);
    return [];
  }
}

/**
 * Build a full address string from components
 */
export function formatAddressString(
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    county?: string | null;
    postcode: string;
    country: string;
  }
): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.county,
    address.postcode,
    address.country,
  ].filter(Boolean);
  
  return parts.join(", ");
}

// Type for Nominatim API response
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state_district?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Clear the address cache (for testing)
 */
export function clearAddressCache(): void {
  addressCache.clear();
}
