/**
 * Mojeek Search Engine (Scraper)
 * محرك بحث مستقل من UK
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const MOJEEK_SEARCH_URL = 'https://www.mojeek.com/search';

export class MojeekEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'mojeek' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const params = new URLSearchParams( {
            q: options.query,
            fmt: 'html',
        } );

        const response = await fetch( `${ MOJEEK_SEARCH_URL }?${ params }`, {
            method: 'GET',
            headers: {
                ...this.getBaseHeaders(),
                'Accept': 'text/html',
                'Referer': 'https://www.mojeek.com/',
            },
        } );

        if ( !response.ok )
        {
            throw new Error( `Mojeek error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // Mojeek له هيكل بسيط نسبياً
        const resultPattern = /<li[^>]*class="[^"]*results-standard[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="[^"]*s[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;

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
                    source: 'mojeek',
                    relevanceScore: 0.7 - ( count * 0.05 ),
                    domain: this.extractDomain( url ),
                } );
                count++;
            }
        }

        // نمط بديل أبسط
        if ( results.length === 0 )
        {
            const simplePattern = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*class="[^"]*ob[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

            while ( ( match = simplePattern.exec( html ) ) !== null && count < maxResults )
            {
                const url = match[ 1 ];
                const title = this.cleanText( this.stripHtml( match[ 2 ] ) );

                if ( url && title && !url.includes( 'mojeek.com' ) )
                {
                    results.push( {
                        id: this.generateId(),
                        title,
                        url,
                        snippet: '',
                        source: 'mojeek',
                        relevanceScore: 0.7 - ( count * 0.05 ),
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
                && !url.includes( 'mojeek.com' );
        } catch
        {
            return false;
        }
    }
}

export default MojeekEngine;
