/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOCALE PROVIDER & HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Context Provider و Hook لإدارة اللغة في التطبيق
 * 
 * @version 2.0.0 - Simplified (searchandthink removed)
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { LocaleCode, DEFAULT_LOCALE, LOCALES, getLocaleConfig, isRTL } from './locales';

const LOCALE_STORAGE_KEY = 'nexus-locale';

interface LocaleContextValue
{
  locale: LocaleCode;
  setLocale: ( locale: LocaleCode ) => void;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
}

const LocaleContext = createContext<LocaleContextValue | undefined>( undefined );

interface LocaleProviderProps
{
  children: ReactNode;
  initialLocale?: LocaleCode;
}

export function LocaleProvider ( { children, initialLocale }: LocaleProviderProps )
{
  const [ locale, setLocaleState ] = useState<LocaleCode>( initialLocale || DEFAULT_LOCALE );
  const [ mounted, setMounted ] = useState( false );

  // Load locale from localStorage on mount
  useEffect( () =>
  {
    const stored = localStorage.getItem( LOCALE_STORAGE_KEY ) as LocaleCode | null;
    if ( stored && LOCALES[ stored ] )
    {
      setLocaleState( stored );
    }
    setMounted( true );
  }, [] );

  // Update document direction when locale changes
  useEffect( () =>
  {
    if ( mounted )
    {
      const config = getLocaleConfig( locale );
      document.documentElement.dir = config.direction;
      document.documentElement.lang = locale;
    }
  }, [ locale, mounted ] );

  const setLocale = useCallback( ( newLocale: LocaleCode ) =>
  {
    if ( LOCALES[ newLocale ] )
    {
      setLocaleState( newLocale );
      localStorage.setItem( LOCALE_STORAGE_KEY, newLocale );
    }
  }, [] );

  const value: LocaleContextValue = {
    locale,
    setLocale,
    direction: getLocaleConfig( locale ).direction,
    isRTL: isRTL( locale ),
  };

  return (
    <LocaleContext.Provider value={ value }>
      { children }
    </LocaleContext.Provider>
  );
}

export function useLocale (): LocaleContextValue
{
  const context = useContext( LocaleContext );
  if ( !context )
  {
    // Return default values if used outside provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => { },
      direction: 'rtl',
      isRTL: true,
    };
  }
  return context;
}

export default LocaleProvider;
