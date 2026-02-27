'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useExchangeStore } from '@/stores/exchangeStore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { exchangeOrchestrator } from '@/lib/services/ExchangeOrchestrator';
import { EXCHANGE_LABELS, EXCHANGE_PRIORITY } from '@/lib/services/exchangeRegistry';
import
{
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EXCHANGES = EXCHANGE_PRIORITY.map( ( id ) => ( {
  id,
  name: EXCHANGE_LABELS[ id ]?.name ?? id,
  color: EXCHANGE_LABELS[ id ]?.color ?? '#9CA3AF',
} ) );

export function ExchangeSelector ()
{
  const { activeExchange, setActiveExchange } = useExchangeStore();
  const [ disabledExchanges, setDisabledExchanges ] = useState<Set<string>>( new Set() );

  useEffect( () =>
  {
    const updateDisabled = () =>
    {
      const disabled = new Set<string>();
      EXCHANGE_PRIORITY.forEach( ( id ) =>
      {
        const status = exchangeOrchestrator.getExchangeStatus( id );
        if ( status?.status === 'disabled' )
        {
          disabled.add( id );
        }
      } );
      setDisabledExchanges( disabled );
    };

    updateDisabled();
    const interval = setInterval( updateDisabled, 2000 );
    return () => clearInterval( interval );
  }, [] );

  // Load preference on mount
  useEffect( () =>
  {
    const loadPreference = async () =>
    {
      if ( !db ) return;
      try
      {
        const user = await ensureAnonymousAuth();
        if ( !user ) return;

        const { getDoc, doc } = await import( 'firebase/firestore' );
        const d = doc( db, 'user_settings', user.uid );
        const snap = await getDoc( d );
        if ( snap.exists() && snap.data()?.activeExchange )
        {
          setActiveExchange( snap.data().activeExchange );
        }
      } catch ( err )
      {
        // Silent fail for permission errors
        if ( process.env.NODE_ENV === 'development' )
        {
          console.log( 'ExchangeSelector: preference loading skipped (likely permissions)' );
        }
      }
    };
    loadPreference();
  }, [ setActiveExchange ] );

  const handleExchangeChange = async ( id: string ) =>
  {
    if ( disabledExchanges.has( id ) ) return;
    setActiveExchange( id as any );

    // Save to Firebase for persistence
    if ( !db ) return;
    try
    {
      const user = await ensureAnonymousAuth();
      if ( !user ) return;

      const d = doc( db, 'user_settings', user.uid );
      await setDoc( d, { activeExchange: id, updatedAt: serverTimestamp() }, { merge: true } );
    } catch ( err )
    {
      // Silent fail for permission errors
      if ( process.env.NODE_ENV === 'development' )
      {
        console.log( 'ExchangeSelector: preference saving skipped (likely permissions)' );
      }
    }
  };

  const currentExchange = EXCHANGES.find( e => e.id === activeExchange ) || EXCHANGES[ 0 ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={ { scale: 1.02 } }
          whileTap={ { scale: 0.98 } }
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all outline-none"
          title="اختر المنصة"
        >
          <span className="text-[11px] font-bold tracking-wider uppercase text-gray-300 hidden sm:inline">
            { currentExchange.name }
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-gray-300 sm:hidden">
            { currentExchange.name.substring( 0, 3 ) }
          </span>
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-48 max-h-[400px] overflow-y-auto custom-scrollbar p-1.5 bg-[#0c0e0d]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100]"
      >
        <div className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/[0.04] mb-1 sticky top-0 bg-[#0c0e0d]/95 backdrop-blur-xl z-10">
          اختر المنصة
        </div>
        { EXCHANGES.map( ( ex ) => (
          <DropdownMenuItem
            key={ ex.id }
            onClick={ () => handleExchangeChange( ex.id ) }
            disabled={ disabledExchanges.has( ex.id ) }
            className={ `flex items-center justify-between px-3 py-2 rounded-xl transition-all group cursor-pointer outline-none ${ disabledExchanges.has( ex.id )
              ? 'opacity-40 cursor-not-allowed'
              : activeExchange === ex.id
                ? 'bg-white/[0.06] text-white'
                : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
              }` }
          >
            <div className="flex items-center gap-3">
              <div
                className={ `w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125 exchange-dot-${ ex.id }` }
              />
              <style>{ `.exchange-dot-${ ex.id }{background-color:${ ex.color };}` }</style>
              <span className="text-xs font-bold tracking-wide">{ ex.name }</span>
            </div>
            { activeExchange === ex.id && (
              <Check className="w-3 h-3 text-cyan-400" />
            ) }
          </DropdownMenuItem>
        ) ) }
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
