import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/services/address-lookup";
import { headers } from "next/headers";

/**
 * GET /api/address/search?q=10+Downing+Street
 * Search for addresses using Nominatim (OpenStreetMap)
 * Rate limited and cached
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  
  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters" },
      { status: 400 }
    );
  }
  
  // Get client IP for rate limiting
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0] || "unknown";
  
  try {
    const results = await searchAddress(query, clientIp);
    
    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("[api/address/search] Error:", error);
    return NextResponse.json(
      { error: "Failed to search addresses" },
      { status: 500 }
    );
  }
}
