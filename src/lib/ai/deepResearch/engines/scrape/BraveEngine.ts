/**
 * Brave Search Engine (Scraper)
 * محرك بحث Brave
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const BRAVE_SEARCH_URL = 'https://search.brave.com/search';

export class BraveEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'brave' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const params = new URLSearchParams( {
            q: options.query,
            source: 'web',
        } );

        const response = await fetch( `${ BRAVE_SEARCH_URL }?${ params }`, {
            method: 'GET',
            headers: {
                ...this.getBaseHeaders(),
                'Accept': 'text/html,application/xhtml+xml',
                'Referer': 'https://search.brave.com/',
            },
        } );

        if ( !response.ok )
        {
            throw new Error( `Brave Search error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // نمط لاستخراج النتائج
        const resultPattern = /<div[^>]*class="[^"]*snippet[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="[^"]*snippet-description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

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
                    source: 'brave',
                    relevanceScore: 0.75 - ( count * 0.05 ),
                    domain: this.extractDomain( url ),
                } );
                count++;
            }
        }

        // نمط بديل
        if ( results.length === 0 )
        {
            const altPattern = /data-type="web"[\s\S]*?href="(https?:\/\/[^"]+)"[\s\S]*?>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;

            while ( ( match = altPattern.exec( html ) ) !== null && count < maxResults )
            {
                const url = match[ 1 ];
                const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
                const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

                if ( url && title && !url.includes( 'brave.com' ) )
                {
                    results.push( {
                        id: this.generateId(),
                        title,
                        url,
                        snippet,
                        source: 'brave',
                        relevanceScore: 0.75 - ( count * 0.05 ),
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
                && !url.includes( 'brave.com' );
        } catch
        {
            return false;
        }
    }
}

export default BraveEngine;
