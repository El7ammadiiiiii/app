"use client";

import React from "react";
import { TrendScannerProvider } from "@/contexts/TrendScannerContext";
import { LevelsScannerProvider } from "@/contexts/LevelsScannerContext";
import { DivergenceScannerProvider } from "@/contexts/DivergenceScannerContext";
import { VolumeScannerProvider } from "@/contexts/VolumeScannerContext";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrendScannerProvider>
      <LevelsScannerProvider>
        <DivergenceScannerProvider>
          <VolumeScannerProvider>
            {children}
          </VolumeScannerProvider>
        </DivergenceScannerProvider>
      </LevelsScannerProvider>
    </TrendScannerProvider>
  );
}

export default function TrendScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      {children}
    </Providers>
  );
}
