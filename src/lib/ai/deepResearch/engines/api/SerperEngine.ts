/**
 * Serper.dev API Engine (Google Search)
 * محرك بحث Google عبر Serper.dev
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const SERPER_API_ENDPOINT = 'https://google.serper.dev/search';
const SERPER_NEWS_ENDPOINT = 'https://google.serper.dev/news';

interface SerperResult
{
    title: string;
    link: string;
    snippet: string;
    position: number;
    date?: string;
    sitelinks?: { title: string; link: string }[];
}

interface SerperResponse
{
    organic: SerperResult[];
    answerBox?: {
        title?: string;
        answer?: string;
        snippet?: string;
        snippetHighlighted?: string[];
    };
    knowledgeGraph?: {
        title?: string;
        type?: string;
        description?: string;
    };
    relatedSearches?: { query: string }[];
    searchParameters: {
        q: string;
        gl: string;
        hl: string;
        num: number;
    };
}

export class SerperEngine extends BaseSearchEngine
{
    private apiKey: string;

    constructor ()
    {
        super( 'serper' );
        this.apiKey = process.env.SERPER_API_KEY || '';

        if ( !this.apiKey )
        {
            console.warn( '[SerperEngine] SERPER_API_KEY not configured' );
        }
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        if ( !this.apiKey )
        {
            throw new Error( 'SERPER_API_KEY not configured' );
        }

        const response = await fetch( SERPER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-API-KEY': this.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify( {
                q: options.query,
                gl: this.mapRegion( options.region ),
                hl: options.language || 'en',
                num: options.maxResults || 10,
                autocorrect: true,
            } ),
        } );

        if ( !response.ok )
        {
            if ( response.status === 429 )
            {
                throw new Error( 'Rate limit exceeded' );
            }
            throw new Error( `Serper API error: ${ response.status } ${ response.statusText }` );
        }

        const data: SerperResponse = await response.json();

        if ( !data.organic?.length )
        {
            return [];
        }

        return data.organic.map( ( result ): UnifiedSearchResult => ( {
            id: this.generateId(),
            title: this.cleanText( result.title ),
            url: result.link,
            snippet: this.cleanText( result.snippet ),
            source: 'serper',
            relevanceScore: this.calculateRelevance( result ),
            publishedDate: result.date,
            domain: this.extractDomain( result.link ),
        } ) );
    }

    /**
     * البحث في الأخبار
     */
    async searchNews ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        if ( !this.apiKey )
        {
            throw new Error( 'SERPER_API_KEY not configured' );
        }

        const response = await fetch( SERPER_NEWS_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-API-KEY': this.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify( {
                q: options.query,
                gl: this.mapRegion( options.region ),
                hl: options.language || 'en',
                num: options.maxResults || 10,
            } ),
        } );

        if ( !response.ok )
        {
            throw new Error( `Serper News API error: ${ response.status }` );
        }

        const data = await response.json();

        return ( data.news || [] ).map( ( result: SerperResult ): UnifiedSearchResult => ( {
            id: this.generateId(),
            title: this.cleanText( result.title ),
            url: result.link,
            snippet: this.cleanText( result.snippet || '' ),
            source: 'serper',
            relevanceScore: 0.8,
            publishedDate: result.date,
            domain: this.extractDomain( result.link ),
        } ) );
    }

    /**
     * تحويل المنطقة
     */
    private mapRegion ( region?: string ): string
    {
        if ( !region ) return 'us';

        const regionMap: Record<string, string> = {
            'en-US': 'us',
            'en-GB': 'uk',
            'ar-SA': 'sa',
            'ar-AE': 'ae',
            'de-DE': 'de',
            'fr-FR': 'fr',
        };

        return regionMap[ region ] || region.split( '-' )[ 1 ]?.toLowerCase() || 'us';
    }

    /**
     * حساب درجة الصلة بناءً على الموقع
     */
    private calculateRelevance ( result: SerperResult ): number
    {
        // المواقع الأولى أكثر صلة
        const positionScore = Math.max( 0, 1 - ( result.position - 1 ) * 0.08 );
        return Math.round( positionScore * 100 ) / 100;
    }
}

export default SerperEngine;
