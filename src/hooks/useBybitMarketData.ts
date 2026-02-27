"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse, OHLCV, OrderBook, Ticker, Trade } from "@/types/exchanges";

interface UseBybitOptions
{
    symbol: string;
    enabled?: boolean;
    refreshInterval?: number;
}

export function useBybitTicker ( opts: UseBybitOptions )
{
    const { symbol, enabled = true, refreshInterval = 1000 } = opts;
    const [ data, setData ] = useState<Ticker | null>( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState<string | null>( null );
    const intervalRef = useRef<NodeJS.Timeout | null>( null );

    const fetcher = useCallback( async () =>
    {
        if ( !enabled ) return;
        try
        {
            const r = await fetch( `/api/bybit/ticker?symbol=${ encodeURIComponent( symbol ) }`, { cache: "no-store" } );
            const result: ApiResponse<Ticker> = await r.json();
            if ( result.success && result.data )
            {
                setData( result.data );
                setError( null );
            } else
            {
                setError( result.error || "Unknown error" );
            }
        } catch ( e )
        {
            setError( ( e as Error ).message );
        } finally
        {
            setLoading( false );
        }
    }, [ enabled, symbol ] );

    useEffect( () =>
    {
        if ( !enabled ) return;
        fetcher();
        if ( refreshInterval > 0 ) intervalRef.current = setInterval( fetcher, refreshInterval );
        return () =>
        {
            if ( intervalRef.current ) clearInterval( intervalRef.current );
        };
    }, [ enabled, fetcher, refreshInterval ] );

    return { data, loading, error, refetch: fetcher };
}

export function useBybitOrderBook ( opts: UseBybitOptions & { limit?: number } )
{
    const { symbol, limit = 100, enabled = true, refreshInterval = 500 } = opts;
    const [ data, setData ] = useState<OrderBook | null>( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState<string | null>( null );
    const intervalRef = useRef<NodeJS.Timeout | null>( null );

    const fetcher = useCallback( async () =>
    {
        if ( !enabled ) return;
        try
        {
            const r = await fetch( `/api/bybit/orderbook?symbol=${ encodeURIComponent( symbol ) }&limit=${ limit }`, { cache: "no-store" } );
            const result: ApiResponse<OrderBook> = await r.json();
            if ( result.success && result.data )
            {
                setData( result.data );
                setError( null );
            } else
            {
                setError( result.error || "Unknown error" );
            }
        } catch ( e )
        {
            setError( ( e as Error ).message );
        } finally
        {
            setLoading( false );
        }
    }, [ enabled, symbol, limit ] );

    useEffect( () =>
    {
        if ( !enabled ) return;
        fetcher();
        if ( refreshInterval > 0 ) intervalRef.current = setInterval( fetcher, refreshInterval );
        return () =>
        {
            if ( intervalRef.current ) clearInterval( intervalRef.current );
        };
    }, [ enabled, fetcher, refreshInterval ] );

    return { data, loading, error, refetch: fetcher };
}

export function useBybitTrades ( opts: UseBybitOptions & { limit?: number } )
{
    const { symbol, limit = 80, enabled = true, refreshInterval = 1000 } = opts;
    const [ data, setData ] = useState<Trade[] | null>( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState<string | null>( null );
    const intervalRef = useRef<NodeJS.Timeout | null>( null );

    const fetcher = useCallback( async () =>
    {
        if ( !enabled ) return;
        try
        {
            const r = await fetch( `/api/bybit/trades?symbol=${ encodeURIComponent( symbol ) }&limit=${ limit }`, { cache: "no-store" } );
            const result: ApiResponse<Trade[]> = await r.json();
            if ( result.success && result.data )
            {
                setData( result.data );
                setError( null );
            } else
            {
                setError( result.error || "Unknown error" );
            }
        } catch ( e )
        {
            setError( ( e as Error ).message );
        } finally
        {
            setLoading( false );
        }
    }, [ enabled, symbol, limit ] );

    useEffect( () =>
    {
        if ( !enabled ) return;
        fetcher();
        if ( refreshInterval > 0 ) intervalRef.current = setInterval( fetcher, refreshInterval );
        return () =>
        {
            if ( intervalRef.current ) clearInterval( intervalRef.current );
        };
    }, [ enabled, fetcher, refreshInterval ] );

    return { data, loading, error, refetch: fetcher };
}

export function useBybitOHLCV ( opts: UseBybitOptions & { timeframe?: string; limit?: number } )
{
    const { symbol, timeframe = "1h", limit = 300, enabled = true, refreshInterval = 8000 } = opts;
    const [ data, setData ] = useState<OHLCV[] | null>( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState<string | null>( null );
    const intervalRef = useRef<NodeJS.Timeout | null>( null );

    const fetcher = useCallback( async () =>
    {
        if ( !enabled ) return;
        try
        {
            const r = await fetch( `/api/bybit/ohlcv?symbol=${ encodeURIComponent( symbol ) }&timeframe=${ encodeURIComponent( timeframe ) }&limit=${ limit }`, { cache: "no-store" } );
            const result: ApiResponse<OHLCV[]> = await r.json();
            if ( result.success && result.data )
            {
                setData( result.data );
                setError( null );
            } else
            {
                setError( result.error || "Unknown error" );
            }
        } catch ( e )
        {
            setError( ( e as Error ).message );
        } finally
        {
            setLoading( false );
        }
    }, [ enabled, symbol, timeframe, limit ] );

    useEffect( () =>
    {
        if ( !enabled ) return;
        fetcher();
        if ( refreshInterval > 0 ) intervalRef.current = setInterval( fetcher, refreshInterval );
        return () =>
        {
            if ( intervalRef.current ) clearInterval( intervalRef.current );
        };
    }, [ enabled, fetcher, refreshInterval ] );

    return { data, loading, error, refetch: fetcher };
}
