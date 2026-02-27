/**
 * Search Engines Index
 * تصدير جميع محركات البحث
 */

// أنواع
export * from './types';

// الكلاس الأساسي
export { BaseSearchEngine } from './BaseSearchEngine';

// محركات API
export { BingEngine } from './api/BingEngine';
export { SerperEngine } from './api/SerperEngine';

// محركات الزحف
export { DuckDuckGoEngine } from './scrape/DuckDuckGoEngine';
export { BraveEngine } from './scrape/BraveEngine';
export { MojeekEngine } from './scrape/MojeekEngine';
export { YepEngine } from './scrape/YepEngine';
export { YouComEngine } from './scrape/YouComEngine';
export { YandexEngine } from './scrape/YandexEngine';
export { NaverEngine } from './scrape/NaverEngine';
export { StartpageEngine } from './scrape/StartpageEngine';

// إنشاء المحركات
import { BingEngine } from './api/BingEngine';
import { SerperEngine } from './api/SerperEngine';
import { DuckDuckGoEngine } from './scrape/DuckDuckGoEngine';
import { BraveEngine } from './scrape/BraveEngine';
import { MojeekEngine } from './scrape/MojeekEngine';
import { YepEngine } from './scrape/YepEngine';
import { YouComEngine } from './scrape/YouComEngine';
import { YandexEngine } from './scrape/YandexEngine';
import { NaverEngine } from './scrape/NaverEngine';
import { StartpageEngine } from './scrape/StartpageEngine';
import type { EngineName } from './types';
import type { BaseSearchEngine } from './BaseSearchEngine';

/**
 * إنشاء محرك بحث بناءً على الاسم
 */
export function createEngine ( name: EngineName ): BaseSearchEngine
{
    switch ( name )
    {
        case 'bing':
            return new BingEngine();
        case 'serper':
            return new SerperEngine();
        case 'duckduckgo':
            return new DuckDuckGoEngine();
        case 'brave':
            return new BraveEngine();
        case 'mojeek':
            return new MojeekEngine();
        case 'yep':
            return new YepEngine();
        case 'youcom':
            return new YouComEngine();
        case 'yandex':
            return new YandexEngine();
        case 'naver':
            return new NaverEngine();
        case 'startpage':
            return new StartpageEngine();
        default:
            throw new Error( `Unknown engine: ${ name }` );
    }
}

/**
 * إنشاء جميع محركات API
 */
export function createApiEngines (): BaseSearchEngine[]
{
    return [
        new BingEngine(),
        new SerperEngine(),
    ];
}

/**
 * إنشاء جميع محركات الزحف
 */
export function createScrapeEngines (): BaseSearchEngine[]
{
    return [
        new DuckDuckGoEngine(),
        new BraveEngine(),
        new MojeekEngine(),
        new YepEngine(),
        new YouComEngine(),
        new YandexEngine(),
        new NaverEngine(),
        new StartpageEngine(),
    ];
}

/**
 * إنشاء جميع المحركات
 */
export function createAllEngines (): BaseSearchEngine[]
{
    return [
        ...createApiEngines(),
        ...createScrapeEngines(),
    ];
}
