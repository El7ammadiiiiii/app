import { redirect } from "next/navigation";

/**
 * Root Landing Page → V4 Static HTML
 * 
 * The full V4 landing page lives at /public/landing-v4.html and is served
 * directly by Firebase Hosting CDN as a static asset.
 * 
 * This server component performs a 307 redirect to serve it at /.
 * Old page.tsx is backed up at page.tsx.bak.
 */
export default function Home() {
  redirect("/landing-v4.html");
}
