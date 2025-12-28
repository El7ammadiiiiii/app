import { calculateIchimoku } from './src/lib/indicators/advanced-indicators';

// Test data
const testData = [
  { timestamp: 1, open: 100, high: 105, low: 95, close: 103, volume: 1000 },
  { timestamp: 2, open: 103, high: 108, low: 102, close: 107, volume: 1200 },
  { timestamp: 3, open: 107, high: 110, low: 105, close: 106, volume: 1100 },
  { timestamp: 4, open: 106, high: 109, low: 104, close: 108, volume: 1300 },
  { timestamp: 5, open: 108, high: 112, low: 107, close: 111, volume: 1400 }
];

const result = calculateIchimoku(testData);
console.log('Ichimoku Test Result:');
console.log('- Tenkan:', result.tenkan.slice(0, 3));
console.log('- Kijun:', result.kijun.slice(0, 3));
console.log('- Signal:', result.signal);
console.log('- Strength:', result.strength);
console.log('✅ Test passed - Function is properly linked!');
