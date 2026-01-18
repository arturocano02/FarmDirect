import { NextRequest, NextResponse } from "next/server";
import { lookupPostcode } from "@/lib/services/address-lookup";

/**
 * GET /api/address/postcode?code=SW1A1AA
 * Look up a UK postcode using postcodes.io
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  
  if (!code) {
    return NextResponse.json(
      { error: "Missing postcode parameter" },
      { status: 400 }
    );
  }
  
  // Basic validation - UK postcodes are 5-8 characters without spaces
  const normalizedCode = code.replace(/\s+/g, "").toUpperCase();
  if (normalizedCode.length < 5 || normalizedCode.length > 8) {
    return NextResponse.json(
      { error: "Invalid postcode format" },
      { status: 400 }
    );
  }
  
  try {
    const result = await lookupPostcode(normalizedCode);
    
    if (!result) {
      return NextResponse.json(
        { error: "Postcode not found", code: normalizedCode },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[api/address/postcode] Error:", error);
    return NextResponse.json(
      { error: "Failed to look up postcode" },
      { status: 500 }
    );
  }
}
