import type { Metadata } from "next";
import { Cinzel, Montserrat, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const shareTech = Share_Tech_Mono({ subsets: ["latin"], weight: "400", variable: "--font-share-tech" });

export const metadata: Metadata = {
  title: "CCCWAYS Nexus | Alt Season Black",
  description: "Next-gen CCCWAYS Nexus platform with AI-first trading intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cinzel.variable} ${montserrat.variable} ${shareTech.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
