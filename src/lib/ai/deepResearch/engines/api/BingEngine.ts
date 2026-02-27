/**
 * Bing Web Search API Engine
 * محرك بحث Bing باستخدام Azure API
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const BING_API_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';

interface BingWebPage
{
    id: string;
    name: string;
    url: string;
    displayUrl: string;
    snippet: string;
    dateLastCrawled?: string;
    language?: string;
    isFamilyFriendly?: boolean;
}

interface BingSearchResponse
{
    _type: string;
    queryContext: {
        originalQuery: string;
    };
    webPages?: {
        totalEstimatedMatches: number;
        value: BingWebPage[];
    };
    rankingResponse?: unknown;
}

export class BingEngine extends BaseSearchEngine
{
    private apiKey: string;

    constructor ()
    {
        super( 'bing' );
        this.apiKey = process.env.BING_SEARCH_API_KEY || '';

        if ( !this.apiKey )
        {
            console.warn( '[BingEngine] BING_SEARCH_API_KEY not configured' );
        }
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        if ( !this.apiKey )
        {
            throw new Error( 'BING_SEARCH_API_KEY not configured' );
        }

        const params = new URLSearchParams( {
            q: options.query,
            count: String( options.maxResults || 10 ),
            offset: '0',
            mkt: options.region || 'en-US',
            safeSearch: options.safeSearch ? 'Strict' : 'Moderate',
        } );

        // إضافة فلتر الحداثة
        if ( options.freshness )
        {
            params.append( 'freshness', this.mapFreshness( options.freshness ) );
        }

        const response = await fetch( `${ BING_API_ENDPOINT }?${ params }`, {
            method: 'GET',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiKey,
                'Accept': 'application/json',
                'Accept-Language': options.language || 'en',
            },
        } );

        if ( !response.ok )
        {
            if ( response.status === 429 )
            {
                throw new Error( 'Rate limit exceeded' );
            }
            throw new Error( `Bing API error: ${ response.status } ${ response.statusText }` );
        }

        const data: BingSearchResponse = await response.json();

        if ( !data.webPages?.value )
        {
            return [];
        }

        return data.webPages.value.map( ( page ): UnifiedSearchResult => ( {
            id: this.generateId(),
            title: this.cleanText( page.name ),
            url: page.url,
            snippet: this.cleanText( page.snippet ),
            source: 'bing',
            relevanceScore: this.calculateRelevance( page, options.query ),
            publishedDate: page.dateLastCrawled,
            domain: this.extractDomain( page.url ),
            language: page.language,
        } ) );
    }

    /**
     * تحويل قيمة الحداثة
     */
    private mapFreshness ( freshness: string ): string
    {
        const map: Record<string, string> = {
            day: 'Day',
            week: 'Week',
            month: 'Month',
            year: 'Year',
        };
        return map[ freshness ] || 'Month';
    }

    /**
     * حساب درجة الصلة
     */
    private calculateRelevance ( page: BingWebPage, query: string ): number
    {
        const queryWords = query.toLowerCase().split( /\s+/ );
        const titleLower = page.name.toLowerCase();
        const snippetLower = page.snippet.toLowerCase();

        let score = 0.5; // Base score

        // مطابقة الكلمات في العنوان
        for ( const word of queryWords )
        {
            if ( word.length > 2 )
            {
                if ( titleLower.includes( word ) ) score += 0.15;
                if ( snippetLower.includes( word ) ) score += 0.05;
            }
        }

        // مطابقة العبارة كاملة
        if ( titleLower.includes( query.toLowerCase() ) )
        {
            score += 0.2;
        }

        return Math.min( 1, score );
    }
}

export default BingEngine;
