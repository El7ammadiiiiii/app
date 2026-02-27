/**
 * Firebase Admin SDK
 * ⚠️ SERVER-ONLY: هذا الملف يستخدم firebase-admin ولا يعمل في Client Components
 */

import 'server-only';

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;

function initAdmin ()
{
  if ( db ) return db;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace( /\\n/g, "\n" );

  if ( !projectId || !clientEmail || !privateKey )
  {
    throw new Error(
      "Firebase Admin credentials are missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  if ( getApps().length === 0 )
  {
    app = initializeApp( {
      credential: cert( {
        projectId,
        clientEmail,
        privateKey,
      } ),
    } );
  } else
  {
    app = getApps()[ 0 ];
  }

  db = getFirestore( app );
  return db;
}

export const getDb = () => initAdmin();
export const getAdminApp = () =>
{
  if ( !app ) initAdmin();
  return app as App;
};
