import { NextResponse } from "next/server";

const BASE_URL = "https://api.coingecko.com/api/v3";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || "/ping";
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        accept: "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `CoinGecko API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("CoinGecko proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from CoinGecko" },
      { status: 500 }
    );
  }
}
