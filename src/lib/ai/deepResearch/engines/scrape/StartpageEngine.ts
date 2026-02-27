/**
 * Startpage Search Engine (Scraper)
 * محرك بحث خاص وآمن
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const STARTPAGE_SEARCH_URL = 'https://www.startpage.com/sp/search';

export class StartpageEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'startpage' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const formData = new URLSearchParams( {
            query: options.query,
            cat: 'web',
            language: 'english',
            prfe: '',
        } );

        const response = await fetch( STARTPAGE_SEARCH_URL, {
            method: 'POST',
            headers: {
                ...this.getBaseHeaders(),
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://www.startpage.com',
                'Referer': 'https://www.startpage.com/',
            },
            body: formData.toString(),
        } );

        if ( !response.ok )
        {
            throw new Error( `Startpage error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // Startpage results pattern
        const resultPattern = /<a[^>]*class="[^"]*result-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="[^"]*result-content[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;

        let match;
        let count = 0;

        while ( ( match = resultPattern.exec( html ) ) !== null && count < maxResults )
        {
            const url = this.cleanUrl( match[ 1 ] );
            const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
            const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

            if ( url && title && this.isValidUrl( url ) )
            {
                results.push( {
                    id: this.generateId(),
                    title,
                    url,
                    snippet,
                    source: 'startpage',
                    relevanceScore: 0.72 - ( count * 0.05 ),
                    domain: this.extractDomain( url ),
                } );
                count++;
            }
        }

        // نمط بديل
        if ( results.length === 0 )
        {
            const altPattern = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*w-gl__result-url[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*w-gl__description[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;

            while ( ( match = altPattern.exec( html ) ) !== null && count < maxResults )
            {
                const url = this.cleanUrl( match[ 1 ] );
                const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
                const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

                if ( url && title && this.isValidUrl( url ) )
                {
                    results.push( {
                        id: this.generateId(),
                        title,
                        url,
                        snippet,
                        source: 'startpage',
                        relevanceScore: 0.72 - ( count * 0.05 ),
                        domain: this.extractDomain( url ),
                    } );
                    count++;
                }
            }
        }

        // نمط ثالث للنتائج البسيطة
        if ( results.length === 0 )
        {
            const simplePattern = /<h3[^>]*class="[^"]*result-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

            while ( ( match = simplePattern.exec( html ) ) !== null && count < maxResults )
            {
                const url = this.cleanUrl( match[ 1 ] );
                const title = this.cleanText( this.stripHtml( match[ 2 ] ) );

                if ( url && title && this.isValidUrl( url ) )
                {
                    results.push( {
                        id: this.generateId(),
                        title,
                        url,
                        snippet: '',
                        source: 'startpage',
                        relevanceScore: 0.72 - ( count * 0.05 ),
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

    private cleanUrl ( url: string ): string
    {
        // Startpage قد يستخدم proxy URLs
        if ( url.includes( 'startpage.com/do/proxy' ) )
        {
            try
            {
                const parsed = new URL( url );
                const actualUrl = parsed.searchParams.get( 'u' );
                if ( actualUrl )
                {
                    return decodeURIComponent( actualUrl );
                }
            } catch
            {
                // تجاهل الأخطاء
            }
        }
        return url;
    }

    private isValidUrl ( url: string ): boolean
    {
        try
        {
            const parsed = new URL( url );
            return ( parsed.protocol === 'http:' || parsed.protocol === 'https:' )
                && !url.includes( 'startpage.com' );
        } catch
        {
            return false;
        }
    }
}

export default StartpageEngine;
