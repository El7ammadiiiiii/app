import { useState, useEffect } from 'react';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface UseBinanceKlinesProps {
  symbol: string;
  interval?: string;
  limit?: number;
}

export function useBinanceKlines({ 
  symbol, 
  interval = '1d', 
  limit = 100 
}: UseBinanceKlinesProps) {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // تحويل الرمز من XRP/USDT إلى XRPUSDT
        const binanceSymbol = symbol.replace('/', '');
        
        // استخدام Binance API مباشرة
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const klines = await response.json();

        if (!Array.isArray(klines)) {
          throw new Error('Invalid data format');
        }

        const formattedData: CandleData[] = klines.map((kline: any) => ({
          time: kline[0] / 1000, // تحويل من milliseconds إلى seconds
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
        }));

        if (isMounted) {
          setData(formattedData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching Binance data:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    fetchData();

    // تحديث البيانات كل 5 ثواني للبيانات الحية
    if (interval === '1m' || interval === '5m' || interval === '15m') {
      timeoutId = setInterval(fetchData, 5000);
    } else if (interval === '1h' || interval === '4h') {
      timeoutId = setInterval(fetchData, 30000); // كل 30 ثانية
    } else {
      timeoutId = setInterval(fetchData, 60000); // كل دقيقة للأطر الزمنية الأكبر
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearInterval(timeoutId);
      }
    };
  }, [symbol, interval, limit]);

  return { data, loading, error };
}
