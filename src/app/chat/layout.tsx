"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout wrapper for chat section
  return <AppLayout>{children}</AppLayout>;
}
