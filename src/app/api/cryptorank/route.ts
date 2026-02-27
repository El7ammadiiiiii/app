import { NextResponse } from "next/server";

const BASE_URL = "https://api.cryptorank.io/v1";
// Always fetch the key from environment variables for security
const API_KEY = process.env.CRYPTORANK_API_KEY;

export async function GET ( request: Request )
{
  const { searchParams } = new URL( request.url );
  const endpoint = searchParams.get( "endpoint" );

  if ( !endpoint )
  {
    return NextResponse.json(
      { error: "Endpoint parameter is required" },
      { status: 400 }
    );
  }

  if ( !API_KEY )
  {
    return NextResponse.json(
      { error: "Configuration Error: CRYPTORANK_API_KEY is missing." },
      { status: 500 }
    );
  }

  try
  {
    // Construct the actual URL with API Key
    // endpoint example: /ico or /ico/upcoming
    const cleanEndpoint = endpoint.startsWith( '/' ) ? endpoint : `/${ endpoint }`;

    // Pass through other query parameters
    const queryParams = new URLSearchParams();
    searchParams.forEach( ( value, key ) =>
    {
      if ( key !== "endpoint" )
      {
        queryParams.append( key, value );
      }
    } );
    queryParams.append( "api_key", API_KEY );

    const url = `${ BASE_URL }${ cleanEndpoint }?${ queryParams.toString() }`;

    // console.log(`Proxying request to: ${url}`); // specific logging may expose keys in logs, be careful

    const response = await fetch( url, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    } );

    if ( !response.ok )
    {
      const errorText = await response.text();
      console.error( `Cryptorank API Error [${ response.status }]: ${ errorText }` );
      return NextResponse.json(
        { error: `Cryptorank API Error: ${ response.status }`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json( data );
  } catch ( error )
  {
    console.error( "Cryptorank proxy error:", error );
    return NextResponse.json(
      { error: "Failed to fetch from Cryptorank" },
      { status: 500 }
    );
  }
}
