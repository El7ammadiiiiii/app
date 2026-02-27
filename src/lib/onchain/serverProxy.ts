import { NextRequest, NextResponse } from 'next/server';

const ONCHAIN_API_BASE = process.env.ONCHAIN_API_URL || 'http://127.0.0.1:8000';
// Trace/build can take a while (multiple upstream calls + rate limiting).
const REQUEST_TIMEOUT_MS = Number.parseInt( process.env.ONCHAIN_API_TIMEOUT_MS || '', 10 ) || 60000;

async function fetchWithTimeout ( input: RequestInfo, init?: RequestInit )
{
    const controller = new AbortController();
    const timer = setTimeout( () => controller.abort(), REQUEST_TIMEOUT_MS );
    try
    {
        return await fetch( input, { ...init, signal: controller.signal } );
    } finally
    {
        clearTimeout( timer );
    }
}

function safeJsonParse ( text: string )
{
    try
    {
        return { ok: true as const, value: JSON.parse( text ) };
    } catch ( error )
    {
        return { ok: false as const, error };
    }
}

export async function proxyGet ( req: NextRequest, path: string )
{
    const url = new URL( req.url );
    const target = `${ ONCHAIN_API_BASE }${ path }${ url.search }`;

    try
    {
        const response = await fetchWithTimeout( target, {
            headers: {
                Accept: 'application/json'
            }
        } );

        const raw = await response.text();
        const parsed = safeJsonParse( raw );
        if ( !parsed.ok )
        {
            return NextResponse.json( {
                success: false,
                error: {
                    message: 'ONCHAIN_API_BAD_RESPONSE',
                    status: response.status
                }
            }, { status: 502 } );
        }

        return NextResponse.json( parsed.value, { status: response.status } );
    } catch ( error: any )
    {
        const message = error?.name === 'AbortError' ? 'ONCHAIN_API_TIMEOUT' : 'ONCHAIN_API_UNREACHABLE';
        return NextResponse.json( {
            success: false,
            error: {
                message,
                ...( process.env.NODE_ENV !== 'production'
                    ? { debug: { name: error?.name, message: String( error?.message || error ) } }
                    : {} )
            }
        }, { status: 502 } );
    }
}

export async function proxyPost ( req: NextRequest, path: string )
{
    const target = `${ ONCHAIN_API_BASE }${ path }`;
    const body = await req.text();

    try
    {
        const response = await fetchWithTimeout( target, {
            method: 'POST',
            headers: {
                'Content-Type': req.headers.get( 'content-type' ) || 'application/json',
                Accept: 'application/json'
            },
            body
        } );

        const raw = await response.text();
        const parsed = safeJsonParse( raw );
        if ( !parsed.ok )
        {
            return NextResponse.json( {
                success: false,
                error: {
                    message: 'ONCHAIN_API_BAD_RESPONSE',
                    status: response.status
                }
            }, { status: 502 } );
        }

        return NextResponse.json( parsed.value, { status: response.status } );
    } catch ( error: any )
    {
        const message = error?.name === 'AbortError' ? 'ONCHAIN_API_TIMEOUT' : 'ONCHAIN_API_UNREACHABLE';
        return NextResponse.json( {
            success: false,
            error: {
                message,
                ...( process.env.NODE_ENV !== 'production'
                    ? { debug: { name: error?.name, message: String( error?.message || error ) } }
                    : {} )
            }
        }, { status: 502 } );
    }
}
