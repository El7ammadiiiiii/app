/**
 * Yandex Search Engine (Scraper)
 * محرك بحث روسي
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const YANDEX_SEARCH_URL = 'https://yandex.com/search/';

export class YandexEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'yandex' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const params = new URLSearchParams( {
            text: options.query,
            lr: '84', // International
        } );

        const response = await fetch( `${ YANDEX_SEARCH_URL }?${ params }`, {
            method: 'GET',
            headers: {
                ...this.getBaseHeaders(),
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://yandex.com/',
            },
        } );

        if ( !response.ok )
        {
            throw new Error( `Yandex error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // Yandex له هيكل معقد نسبياً
        const resultPattern = /<li[^>]*class="[^"]*serp-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*class="[^"]*link[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

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
                    source: 'yandex',
                    relevanceScore: 0.7 - ( count * 0.05 ),
                    domain: this.extractDomain( url ),
                } );
                count++;
            }
        }

        // نمط بديل
        if ( results.length === 0 )
        {
            const altPattern = /data-cid="[^"]*"[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/gi;

            while ( ( match = altPattern.exec( html ) ) !== null && count < maxResults )
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
                        source: 'yandex',
                        relevanceScore: 0.7 - ( count * 0.05 ),
                        domain: this.extractDomain( url ),
                    } );
                    count++;
                }
            }
        }

        return results;
    }

    private cleanUrl ( url: string ): string
    {
        // Yandex قد يستخدم redirect URLs
        if ( url.includes( 'yandex.' ) && url.includes( 'redir' ) )
        {
            const match = url.match( /url=([^&]+)/ );
            if ( match )
            {
                try
                {
                    return decodeURIComponent( match[ 1 ] );
                } catch
                {
                    return url;
                }
            }
        }
        return url;
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
                && !url.includes( 'yandex.' );
        } catch
        {
            return false;
        }
    }
}

export default YandexEngine;
