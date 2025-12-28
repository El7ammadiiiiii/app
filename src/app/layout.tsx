import type { Metadata } from "next";
import { Inter, Cairo, IBM_Plex_Mono, League_Spartan } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" });
const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono" 
});
const leagueSpartan = League_Spartan({ 
  subsets: ["latin"], 
  variable: "--font-league-spartan" 
});

export const metadata: Metadata = {
  title: "CCCWAYS | AI-Powered Crypto Intelligence",
  description: "Advanced cryptocurrency analysis platform powered by AI agents for technical, fundamental, and on-chain analysis.",
  keywords: ["crypto", "cryptocurrency", "trading", "analysis", "AI", "blockchain", "on-chain"],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cairo.variable} ${ibmPlexMono.variable} ${leagueSpartan.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          themes={["light", "dark"]}
          enableSystem={false}
          disableTransitionOnChange={false}
          storageKey="cccways-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
