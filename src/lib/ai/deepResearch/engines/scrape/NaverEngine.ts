/**
 * Naver Search Engine (Scraper)
 * محرك بحث كوري
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const NAVER_SEARCH_URL = 'https://search.naver.com/search.naver';

export class NaverEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'naver' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const params = new URLSearchParams( {
            query: options.query,
            where: 'web',
            ie: 'utf8',
        } );

        const response = await fetch( `${ NAVER_SEARCH_URL }?${ params }`, {
            method: 'GET',
            headers: {
                ...this.getBaseHeaders(),
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
                'Referer': 'https://www.naver.com/',
            },
        } );

        if ( !response.ok )
        {
            throw new Error( `Naver error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // Naver web results
        const resultPattern = /<li[^>]*class="[^"]*bx[^"]*"[^>]*>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*class="[^"]*link_tit[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*total_dsc[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

        let match;
        let count = 0;

        while ( ( match = resultPattern.exec( html ) ) !== null && count < maxResults )
        {
            const url = match[ 1 ];
            const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
            const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

            if ( url && title && this.isValidUrl( url ) )
            {
                results.push( {
                    id: this.generateId(),
                    title,
                    url,
                    snippet,
                    source: 'naver',
                    relevanceScore: 0.68 - ( count * 0.05 ),
                    domain: this.extractDomain( url ),
                } );
                count++;
            }
        }

        // نمط بديل للنتائج الدولية
        if ( results.length === 0 )
        {
            const altPattern = /<a[^>]*class="[^"]*link_tit[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

            while ( ( match = altPattern.exec( html ) ) !== null && count < maxResults )
            {
                const url = match[ 1 ];
                const title = this.cleanText( this.stripHtml( match[ 2 ] ) );

                if ( url && title && this.isValidUrl( url ) )
                {
                    results.push( {
                        id: this.generateId(),
                        title,
                        url,
                        snippet: '',
                        source: 'naver',
                        relevanceScore: 0.68 - ( count * 0.05 ),
                        domain: this.extractDomain( url ),
                    } );
                    count++;
                }
            }
        }

        return results;
    }

    private stripHtml ( html: string ): string
    {
        return html
            .replace( /<[^>]*>/g, '' )
            .replace( /&amp;/g, '&' )
            .replace( /&lt;/g, '<' )
            .replace( /&gt;/g, '>' )
            .replace( /&quot;/g, '"' )
            .replace( /&#39;/g, "'" )
            .replace( /&nbsp;/g, ' ' );
    }

    private isValidUrl ( url: string ): boolean
    {
        try
        {
            const parsed = new URL( url );
            return ( parsed.protocol === 'http:' || parsed.protocol === 'https:' )
                && !url.includes( 'naver.com' )
                && !url.includes( 'naver.net' );
        } catch
        {
            return false;
        }
    }
}

export default NaverEngine;
