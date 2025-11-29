import { headers } from "next/headers";

const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const serverEnv = {
  GOOGLE_CLIENT_ID: required(process.env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: required(process.env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET"),
  GOOGLE_REDIRECT_URI: required(process.env.GOOGLE_REDIRECT_URI, "GOOGLE_REDIRECT_URI"),
  GOOGLE_OAUTH_SCOPE:
    process.env.GOOGLE_OAUTH_SCOPE ??
    "openid profile email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
  FIREBASE_PROJECT_ID: required(process.env.FIREBASE_PROJECT_ID, "FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: required(process.env.FIREBASE_CLIENT_EMAIL, "FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: required(process.env.FIREBASE_PRIVATE_KEY, "FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  TOKEN_ENCRYPTION_KEY: required(process.env.TOKEN_ENCRYPTION_KEY, "TOKEN_ENCRYPTION_KEY"),
  SESSION_SECRET: required(process.env.SESSION_SECRET, "SESSION_SECRET"),
};

export const publicEnv = {
  appBaseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000",
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
  },
};

export const getBaseUrl = () => publicEnv.appBaseUrl.replace(/\/$/, "");

export const getLanguageFromHeaders = async (): Promise<string> => {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  return acceptLanguage?.split(",")[0] ?? "ar";
};
