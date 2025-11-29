import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { serverEnv } from "@/lib/env";

let app: App;

export const getAdminApp = () => {
  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: serverEnv.FIREBASE_PROJECT_ID,
        clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
        privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
      }),
      projectId: serverEnv.FIREBASE_PROJECT_ID,
    });
  }
  return app!;
};

export const getDb = () => getFirestore(getAdminApp());
