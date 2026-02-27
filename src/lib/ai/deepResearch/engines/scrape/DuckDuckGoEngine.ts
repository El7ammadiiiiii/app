/**
 * DuckDuckGo Search Engine (Scraper)
 * محرك بحث DuckDuckGo
 */

import { BaseSearchEngine } from '../BaseSearchEngine';
import type { UnifiedSearchResult, SearchOptions } from '../types';

const DDG_HTML_URL = 'https://html.duckduckgo.com/html/';

export class DuckDuckGoEngine extends BaseSearchEngine
{
    constructor ()
    {
        super( 'duckduckgo' );
    }

    async search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>
    {
        const formData = new URLSearchParams();
        formData.append( 'q', options.query );
        formData.append( 'b', '' ); // Start position
        formData.append( 'kl', this.mapRegion( options.region ) );

        const response = await fetch( DDG_HTML_URL, {
            method: 'POST',
            headers: {
                ...this.getBaseHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://duckduckgo.com/',
            },
            body: formData.toString(),
        } );

        if ( !response.ok )
        {
            throw new Error( `DuckDuckGo error: ${ response.status }` );
        }

        const html = await response.text();
        return this.parseResults( html, options.maxResults || 10 );
    }

    private parseResults ( html: string, maxResults: number ): UnifiedSearchResult[]
    {
        const results: UnifiedSearchResult[] = [];

        // نمط لاستخراج النتائج من HTML
        const resultPattern = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

        let match;
        let count = 0;

        while ( ( match = resultPattern.exec( html ) ) !== null && count < maxResults )
        {
            const url = this.decodeUrl( match[ 1 ] );
            const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
            const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

            if ( url && title && this.isValidUrl( url ) )
            {
                results.push( {
                    id: this.generateId(),
                    title,
                    url,
                    snippet,
                    source: 'duckduckgo',
                    relevanceScore: 0.8 - ( count * 0.05 ),
                    domain: this.extractDomain( url ),
                } );
                count++;
            }
        }

        // نمط بديل إذا لم تعمل الطريقة الأولى
        if ( results.length === 0 )
        {
            const altPattern = /class="result__url"[^>]*href="([^"]+)"[\s\S]*?class="result__title"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

            while ( ( match = altPattern.exec( html ) ) !== null && count < maxResults )
            {
                const url = this.decodeUrl( match[ 1 ] );
                const title = this.cleanText( this.stripHtml( match[ 2 ] ) );
                const snippet = this.cleanText( this.stripHtml( match[ 3 ] ) );

                if ( url && title && this.isValidUrl( url ) )
                {
                    results.push( {
                        id: this.generateId(),
                        title,
                        url,
                        snippet,
                        source: 'duckduckgo',
                        relevanceScore: 0.8 - ( count * 0.05 ),
                        domain: this.extractDomain( url ),
                    } );
                    count++;
                }
            }
        }

        return results;
    }

    private decodeUrl ( encodedUrl: string ): string
    {
        try
        {
            // DuckDuckGo يشفر URLs
            if ( encodedUrl.includes( 'uddg=' ) )
            {
                const match = encodedUrl.match( /uddg=([^&]+)/ );
                if ( match )
                {
                    return decodeURIComponent( match[ 1 ] );
                }
            }
            return decodeURIComponent( encodedUrl );
        } catch
        {
            return encodedUrl;
        }
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
            new URL( url );
            return url.startsWith( 'http://' ) || url.startsWith( 'https://' );
        } catch
        {
            return false;
        }
    }

    private mapRegion ( region?: string ): string
    {
        if ( !region ) return 'wt-wt'; // Worldwide

        const regionMap: Record<string, string> = {
            'en-US': 'us-en',
            'en-GB': 'uk-en',
            'ar-SA': 'xa-ar',
            'de-DE': 'de-de',
            'fr-FR': 'fr-fr',
        };

        return regionMap[ region ] || 'wt-wt';
    }
}

export default DuckDuckGoEngine;
