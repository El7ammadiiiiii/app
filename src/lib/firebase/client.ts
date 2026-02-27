"use client";

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import
{
  getFirestore,
  Firestore,
  initializeFirestore,
  connectFirestoreEmulator
} from 'firebase/firestore';
import
{
  getAuth,
  Auth,
  signInAnonymously,
  onAuthStateChanged,
  User,
  setPersistence,
  inMemoryPersistence,
  connectAuthEmulator
} from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
};

const missingConfigKeys = Object.entries( requiredConfig )
  .filter( ( [ _, value ] ) => !value )
  .map( ( [ key ] ) => key );

export const isFirebaseConfigured = missingConfigKeys.length === 0;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let emulatorsConnected = false;
let appCheckInitialized = false;

if ( typeof window !== 'undefined' )
{
  if ( !isFirebaseConfigured )
  {
    console.warn(
      `[Firebase] Missing client config keys: ${ missingConfigKeys.join( ', ' ) }.`
    );
  } else
  {
    if ( !getApps().length )
    {
      app = initializeApp( firebaseConfig );
    } else
    {
      app = getApps()[ 0 ];
    }

    // 🚀 Auto-detect long polling لتجنب خطأ Firestore assertion
    db = initializeFirestore( app, {
      experimentalAutoDetectLongPolling: true,
    } );

    auth = getAuth( app );

    const appCheckEnabled = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED !== 'false';
    const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
    const appCheckDebugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;

    if ( appCheckEnabled && !appCheckInitialized )
    {
      if ( appCheckDebugToken )
      {
        ( window as any ).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
      }

      if ( appCheckSiteKey )
      {
        try
        {
          initializeAppCheck( app, {
            provider: new ReCaptchaV3Provider( appCheckSiteKey ),
            isTokenAutoRefreshEnabled: true,
          } );
          appCheckInitialized = true;
        } catch ( error )
        {
          console.warn( '[Firebase] App Check init failed:', error );
        }
      } else if ( appCheckDebugToken )
      {
        console.warn( '[Firebase] App Check site key missing; debug token ignored.' );
      }
    }

    // 🛠️ الربط بالمحاكيات بشكل اختياري عبر متغير بيئة
    const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true';
    const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost';
    const firestorePort = Number( process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT || 8081 );
    const authPort = Number( process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || 9099 );
    const rtdbPort = Number( process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT || 9000 );

    if ( useEmulators && !emulatorsConnected )
    {
      emulatorsConnected = true;
      console.log( '🚀 Connecting to Firebase Emulators...' );
      connectFirestoreEmulator( db, emulatorHost, firestorePort );
      connectAuthEmulator( auth, `http://${ emulatorHost }:${ authPort }` );
      const rtdb = getDatabase( app );
      connectDatabaseEmulator( rtdb, emulatorHost, rtdbPort );
    }

    // استخدام الذاكرة فقط لتجنب حظر المتصفح (Tracking Prevention)
    setPersistence( auth, inMemoryPersistence ).catch( () => { } );

    // 🚀 Pre-warm: بدء المصادقة فوراً عند تحميل الموقع
    signInAnonymously( auth ).catch( () => { _anonAuthFailed = true; } );
  }
}

// Track anonymous auth failure to avoid spamming Firebase
let _anonAuthFailed = false;

export { app, db, auth };
export const getFirebaseApp = () => app;
export default app as FirebaseApp;

export async function ensureAnonymousAuth (): Promise<User | null>
{
  if ( typeof window === 'undefined' || !auth || !isFirebaseConfigured ) return null;
  if ( auth.currentUser ) return auth.currentUser;

  // If anonymous auth already failed, don't keep retrying (prevents 401 spam)
  if ( _anonAuthFailed ) return null;

  return new Promise( ( resolve ) =>
  {
    const unsubscribe = onAuthStateChanged( auth, ( user ) =>
    {
      if ( user )
      {
        _anonAuthFailed = false; // Reset on success
        unsubscribe();
        resolve( user );
      }
    }, ( error ) =>
    {
      console.warn( '[Firebase] Anonymous auth state error:', error.code || error.message );
      _anonAuthFailed = true;
      unsubscribe();
      resolve( null );
    } );

    signInAnonymously( auth ).catch( ( error ) =>
    {
      console.warn( '[Firebase] Anonymous sign-in failed:', error.code || error.message );
      _anonAuthFailed = true;
      unsubscribe();
      resolve( null );
    } );
  } );
}
