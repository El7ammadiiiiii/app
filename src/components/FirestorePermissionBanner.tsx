"use client";

import React, { useEffect, useState } from 'react';
import useTimeout from '@/hooks/useTimeout';
import { ensureAnonymousAuth } from '@/lib/firebase/client';

export default function FirestorePermissionBanner ()
{
  const [ visible, setVisible ] = useState( false );
  const [ message, setMessage ] = useState<string | null>( null );
  const [ autoHide, setAutoHide ] = useState( false );
  useTimeout( () => { if ( autoHide ) setVisible( false ); }, autoHide ? 5000 : undefined, [ autoHide ] );
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id';

  useEffect( () =>
  {
    const show = ( e: CustomEvent ) =>
    {
      setMessage( e?.detail?.message || 'Missing or insufficient permissions' );
      setVisible( true );
    };
    window.addEventListener( 'firestore-permission-denied', show as EventListener );
    return () => { window.removeEventListener( 'firestore-permission-denied', show as EventListener ); };
  }, [] );

  if ( !visible ) return null;

  const retry = async () =>
  {
    try
    {
      setMessage( 'Attempting anonymous sign-in...' );
      await ensureAnonymousAuth();
      // ask contexts to resubscribe
      window.dispatchEvent( new CustomEvent( 'firestore-retry-request' ) );
      setMessage( 'Retry requested — check console for progress.' );
      setAutoHide( true );
    } catch ( e )
    {
      console.error( 'Retry anonymous auth failed:', e );
      setMessage( 'Attempt failed — check Firebase console authentication settings.' );
    }
  };

  return (
    <div className="fixed top-3 left-3 right-3 z-[9999] flex justify-center">
      <div className="bg-[#2b2b2b] text-white px-3.5 py-2.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.4)] max-w-[980px] w-full">
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <strong>Firestore permission error</strong>
            <div className="text-[13px] opacity-90">{ message }</div>
          </div>
          <div className="flex gap-2">
            <button onClick={ retry } className="bg-emerald-500 text-white px-2.5 py-1.5 rounded-md">Retry (anon)</button>
            <a href={ `https://console.firebase.google.com/project/${ projectId }/firestore/rules` } target="_blank" rel="noreferrer" className="bg-slate-700 text-white px-2.5 py-1.5 rounded-md no-underline">Open Rules</a>
            <button onClick={ () => setVisible( false ) } className="bg-transparent text-gray-400 px-2.5 py-1.5">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}
