import CandlestickChart from "@/components/charts/CandlestickChart";
import MetricSparkline from "@/components/charts/MetricSparkline";

const mockCandles = Array.from({ length: 40 }, (_, idx) => {
  const base = 68000 + idx * 120;
  const open = base + Math.sin(idx / 3) * 250;
  const close = open + (Math.random() - 0.5) * 600;
  const high = Math.max(open, close) + Math.random() * 400;
  const low = Math.min(open, close) - Math.random() * 400;

  return {
    time: `2024-11-${(idx + 1).toString().padStart(2, "0")}`,
    open,
    high,
    low,
    close,
  };
});

const mockSeries = mockCandles.map((c) => c.close);

export default function ChartsShowcase() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Visualization System</p>
          <h1 className="text-4xl font-semibold tracking-tight">Institutional-Grade Charts</h1>
          <p className="max-w-3xl text-base text-slate-300">
            هذه الصفحة تعرض أفضل مزيج للرسوم البيانية الاحترافية باستخدام مكتبة Plotly. الرسوم جاهزة للاستخدام
            مباشرة داخل لوحات التحكم لعرض بيانات الأسعار، أحجام التداول، والمؤشرات المتقدمة.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <MetricSparkline label="TVL YoY" currentValue="$58.4B" changePct={4.83} series={mockSeries.slice(-12)} />
          <MetricSparkline label="Active Addresses" currentValue="2.1M" changePct={-1.24} series={mockSeries.slice(5, 17)} />
          <MetricSparkline label="DEX Volume" currentValue="$4.2B" changePct={8.52} series={mockSeries.slice(10, 22)} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Price Intelligence</p>
              <h2 className="text-2xl font-semibold">BTC vs USD</h2>
            </div>
            <div className="rounded-full border border-white/10 px-4 py-1 text-sm text-slate-400">Plotly.js Engine</div>
          </div>
          <CandlestickChart candles={mockCandles} title="Last 40 Sessions" />
        </section>
      </div>
    </main>
  );
}
