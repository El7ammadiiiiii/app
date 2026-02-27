/**
 * You.com Search Engine (Scraper)
 * محرك بحث AI-enhanced
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const YOUCOM_SEARCH_URL = 'https://you.com/search';

export class YouComEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'youcom' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const params = new URLSearchParams( {
            q: options.query,
            tbm: 'web',
        } );

        const response = await fetch( `${ YOUCOM_SEARCH_URL }?${ params }`, {
            method: 'GET',
            headers: {
                ...this.getBaseHeaders(),
                'Accept': 'text/html,application/xhtml+xml',
                'Referer': 'https://you.com/',
            },
        } );

        if ( !response.ok )
        {
            throw new Error( `You.com error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // محاولة استخراج JSON المضمن
        const jsonMatch = html.match( /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/ );

        if ( jsonMatch )
        {
            try
            {
                const data = JSON.parse( jsonMatch[ 1 ] );
                const webResults = data?.props?.pageProps?.searchResults?.web?.results ||
                    data?.props?.pageProps?.initialData?.web?.results || [];

                for ( let i = 0; i < Math.min( webResults.length, maxResults ); i++ )
                {
                    const result = webResults[ i ];
                    if ( result.url && result.title )
                    {
                        results.push( {
                            id: this.generateId(),
                            title: this.cleanText( result.title ),
                            url: result.url,
                            snippet: this.cleanText( result.description || result.snippet || '' ),
                            source: 'youcom',
                            relevanceScore: 0.72 - ( i * 0.05 ),
                            domain: this.extractDomain( result.url ),
                            publishedDate: result.date,
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
        const resultPattern = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*data-testid="[^"]*link[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;

        let match;
        let count = 0;

        while ( ( match = resultPattern.exec( html ) ) !== null && count < maxResults )
        {
            const url = match[ 1 ];
            const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
            const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

            if ( url && title && !url.includes( 'you.com' ) )
            {
                results.push( {
                    id: this.generateId(),
                    title,
                    url,
                    snippet,
                    source: 'youcom',
                    relevanceScore: 0.72 - ( count * 0.05 ),
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

export default YouComEngine;
