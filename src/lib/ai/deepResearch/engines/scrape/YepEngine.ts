/**
 * Yep Search Engine (Scraper)
 * محرك بحث مستقل يركز على الخصوصية
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const YEP_SEARCH_URL = 'https://yep.com/web';

export class YepEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'yep' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const params = new URLSearchParams( {
            q: options.query,
        } );

        const response = await fetch( `${ YEP_SEARCH_URL }?${ params }`, {
            method: 'GET',
            headers: {
                ...this.getBaseHeaders(),
                'Accept': 'text/html,application/xhtml+xml',
                'Referer': 'https://yep.com/',
            },
        } );

        if ( !response.ok )
        {
            throw new Error( `Yep error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // استخراج JSON المضمن إذا وجد
        const jsonMatch = html.match( /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/ );

        if ( jsonMatch )
        {
            try
            {
                const data = JSON.parse( jsonMatch[ 1 ] );
                const searchResults = data?.props?.pageProps?.results?.web || [];

                for ( let i = 0; i < Math.min( searchResults.length, maxResults ); i++ )
                {
                    const result = searchResults[ i ];
                    if ( result.url && result.title )
                    {
                        results.push( {
                            id: this.generateId(),
                            title: this.cleanText( result.title ),
                            url: result.url,
                            snippet: this.cleanText( result.snippet || result.description || '' ),
                            source: 'yep',
                            relevanceScore: 0.7 - ( i * 0.05 ),
                            domain: this.extractDomain( result.url ),
                        } );
                    }
                }

                return results;
            } catch
            {
                // Fall through to HTML parsing
            }
        }

        // HTML parsing fallback
        const resultPattern = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;

        let match;
        let count = 0;

        while ( ( match = resultPattern.exec( html ) ) !== null && count < maxResults )
        {
            const url = match[ 1 ];
            const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
            const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

            if ( url && title && !url.includes( 'yep.com' ) )
            {
                results.push( {
                    id: this.generateId(),
                    title,
                    url,
                    snippet,
                    source: 'yep',
                    relevanceScore: 0.7 - ( count * 0.05 ),
                    domain: this.extractDomain( url ),
                } );
                count++;
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
}

export default YepEngine;
