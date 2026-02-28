import type { Metadata, Viewport } from "next";
import { Inter, Cairo, IBM_Plex_Mono, League_Spartan } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { GlobalBackground } from "@/components/layout/GlobalBackground";
import "./globals.css";
import FirestorePermissionBanner from '@/components/FirestorePermissionBanner';
import FirestoreHydrator from '@/components/FirestoreHydrator';
import { SkipToContent } from '@/hooks/useAccessibility';

const inter = Inter( { subsets: [ "latin" ], variable: "--font-inter", display: 'swap' } );
const cairo = Cairo( { subsets: [ "arabic" ], variable: "--font-cairo", display: 'swap' } );
const ibmPlexMono = IBM_Plex_Mono( {
  subsets: [ "latin" ],
  weight: [ "400", "500", "600", "700" ],
  variable: "--font-ibm-plex-mono",
  display: 'swap'
} );
const leagueSpartan = League_Spartan( {
  subsets: [ "latin" ],
  variable: "--font-league-spartan",
  display: 'swap'
} );

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0e0d",
};

export const metadata: Metadata = {
  title: "CCWAYS | AI-Powered Crypto Intelligence",
  description: "Advanced cryptocurrency analysis platform powered by AI agents for technical, fundamental, and on-chain analysis.",
  keywords: [ "crypto", "cryptocurrency", "trading", "analysis", "AI", "blockchain", "on-chain" ],
};

export default function RootLayout ( {
  children,
}: Readonly<{
  children: React.ReactNode;
}> )
{
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <title>CCWAYS | AI-Powered Crypto Intelligence</title>
        {/* viewport is set via the exported viewport object above */}
        {/* Service Worker for offline support & caching */}
        <script
          dangerouslySetInnerHTML={ {
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              }
            `
          } }
        />
      </head>
      <body
        className={ `${ inter.variable } ${ cairo.variable } ${ ibmPlexMono.variable } ${ leagueSpartan.variable } font-sans antialiased` }
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          themes={ [ "light", "dark" ] }
          enableSystem={ false }
          disableTransitionOnChange={ false }
          storageKey="CCWAYS-theme"
        >
          <SkipToContent />
          <GlobalBackground />
          <FirestorePermissionBanner />
          <FirestoreHydrator />
          <main id="main-content">{ children }</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
