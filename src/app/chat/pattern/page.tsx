'use client';

import dynamic from 'next/dynamic';

const PatternScannerNewContent = dynamic(
  () => import( '@/components/pattern-scanner-new/PatternScannerNewContent' ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-transparent backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-cyan-400/70 font-medium animate-pulse">جاري تحميل ماسح الأنماط...</span>
        </div>
      </div>
    ),
  }
);

export default function PatternPage ()
{
  return <PatternScannerNewContent />;
}
