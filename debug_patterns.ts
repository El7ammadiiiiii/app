
import { detectChartPatterns, OHLCV } from './src/lib/indicators/chart-patterns';
import { detectHeadAndShoulders } from './src/lib/indicators/missing-patterns';

// Mock data generator
function generateData(length: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  for (let i = 0; i < length; i++) {
    // Create a simple trend + noise
    price += (Math.random() - 0.45); 
    data.push({
      timestamp: Date.now() - (length - i) * 3600000,
      open: price,
      high: price + Math.random(),
      low: price - Math.random(),
      close: price + (Math.random() - 0.5),
      volume: 1000 + Math.random() * 500
    });
  }
  return data;
}

// Create a Head and Shoulders pattern manually
function generateHSData(): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 100;
    const pattern = [
        100, 105, 110, 105, 100, // Left Shoulder
        100, 110, 120, 110, 100, // Head
        100, 105, 110, 105, 100  // Right Shoulder
    ];
    
    // Pre-trend
    for(let i=0; i<20; i++) {
        price += 1;
        data.push({timestamp: i, open: price, high: price+1, low: price-1, close: price, volume: 1000});
    }

    // Pattern
    for(let p of pattern) {
        data.push({timestamp: data.length, open: p, high: p+1, low: p-1, close: p, volume: 1000});
    }

    // Post-trend
    for(let i=0; i<20; i++) {
        price -= 1;
        data.push({timestamp: data.length, open: price, high: price+1, low: price-1, close: price, volume: 1000});
    }
    return data;
}

async function runDebug() {
  console.log("Generating data...");
  const randomData = generateData(200);
  const hsData = generateHSData();

  console.log("Testing Advanced Patterns (Random Data)...");
  try {
    const patterns = detectChartPatterns(randomData);
    console.log(`Found ${patterns.length} advanced patterns.`);
    patterns.forEach(p => console.log(`- ${p.name} (${p.confidence}%)`));
  } catch (e) {
    console.error("Error in detectChartPatterns:", e);
  }

  console.log("\nTesting Head & Shoulders (Synthetic Data)...");
  try {
    const hsPatterns = detectHeadAndShoulders(hsData, { mode: 'balanced' });
    console.log(`Found ${hsPatterns.length} H&S patterns.`);
    hsPatterns.forEach(p => console.log(`- ${p.type} (${p.confidence}%)`));
  } catch (e) {
    console.error("Error in detectHeadAndShoulders:", e);
  }
}

runDebug();
