import { NextResponse } from "next/server";

const DUNE_API_KEY = "sim_UI105svDKW42ncZ7E7p7lKH8lEKkG6MI";

export async function GET (
    request: Request,
    { params }: { params: { queryId: string } }
)
{
    const queryId = params.queryId;

    if ( !queryId )
    {
        return NextResponse.json( { error: "Query ID is required" }, { status: 400 } );
    }

    try
    {
        const url = `https://api.dune.com/api/v1/query/${ queryId }/results`;

        const response = await fetch( url, {
            headers: {
                "X-DUNE-API-KEY": DUNE_API_KEY,
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        } );

        if ( !response.ok )
        {
            const errorText = await response.text();
            console.error( `Dune API Error (Query ${ queryId }):`, response.status, errorText );
            return NextResponse.json( { error: `Dune API Failed: ${ response.status }` }, { status: response.status } );
        }

        const data = await response.json();
        return NextResponse.json( data );
    } catch ( error )
    {
        console.error( `Dune Proxy Error (Query ${ queryId }):`, error );
        return NextResponse.json( { error: "Internal Server Error" }, { status: 500 } );
    }
}
