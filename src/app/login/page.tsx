import Script from "next/script";
import type { Metadata } from "next";
import { LoginHero } from "@/components/auth/LoginHero";

export const metadata: Metadata = {
  title: "CCCWAYS Nexus | تسجيل الدخول",
  description: "Alt Season Black login powered by Google OAuth وFirebase Firestore.",
};

export default function LoginPage() {
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      <LoginHero />
    </>
  );
}
