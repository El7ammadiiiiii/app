
import { detectChartPatterns, OHLCV } from './src/lib/indicators/chart-patterns';

// Create some sample data (e.g. an ascending channel)
const data: OHLCV[] = [];
let price = 100;
for (let i = 0; i < 100; i++) {
  // Create a channel with slope 1
  const trend = i * 1;
  const noise = Math.sin(i * 0.5) * 2;
  const open = price + trend + noise;
  const close = open + (Math.random() - 0.5);
  const high = Math.max(open, close) + Math.random();
  const low = Math.min(open, close) - Math.random();
  
  data.push({
    timestamp: i * 3600 * 1000,
    open,
    high,
    low,
    close,
    volume: 1000
  });
}

console.log("Running detection...");
try {
  const patterns = detectChartPatterns(data, { enableEnhancedScoring: true });
  console.log(`Found ${patterns.length} patterns.`);
  patterns.forEach(p => console.log(`- ${p.name} (${p.confidence}%)`));
} catch (e) {
  console.error("Error:", e);
}
