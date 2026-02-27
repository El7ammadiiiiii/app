const Scanner = require('../scanner');

/**
 * Extended Test Script for Standard Patterns, Flags, and Pennants
 */

function generateMockData(count = 5000, type = 'random') {
    const high = [];
    const low = [];
    const close = [];
    let lastPrice = 100;

    for (let i = 0; i < count; i++) {
        let change = (Math.random() - 0.5) * 2;
        
        if (type === 'bull_flag' && i > count - 50 && i < count - 30) {
            change = 2; 
        } else if (type === 'bull_flag' && i >= count - 30) {
            change = (Math.random() - 0.6) * 0.5;
        } else if (type === 'bull_pennant' && i > count - 60 && i < count - 40) {
            change = 3; // Strong Pole
        } else if (type === 'bull_pennant' && i >= count - 40) {
            // Symmetrical contraction for Pennant
            const factor = (count - i) / 40;
            change = (Math.random() - 0.5) * factor;
        }

        lastPrice += change;
        high.push(lastPrice + 0.5);
        low.push(lastPrice - 0.5);
        close.push(lastPrice);
    }

    return { high, low, close };
}

function runTest(type = 'random') {
    console.log(`\n--- Running Test: ${type.toUpperCase()} ---`);
    
    const config = {
        numberOfPivots: 5,
        errorRatio: 20.0,
        flatRatio: 0.2,
        flagRatio: 0.618,
        avoidOverlap: true,
        applyAngleDiff: true,
        minAngleDiff: 2,
        maxAngleDiff: 45,
        zigzags: [
            { enabled: true, length: 3, depth: 144 },
            { enabled: true, length: 5, depth: 89 }
        ]
    };

    const scanner = new Scanner(config);
    const data = generateMockData(5000, type);

    console.log(`Scanning ${data.high.length} bars...`);
    const startTime = Date.now();
    const result = scanner.scan(data);
    const endTime = Date.now();

    console.log(`Scan completed in ${endTime - startTime}ms`);
    console.log(`Detected Standard Patterns: ${result.patterns.length}`);
    console.log(`Detected Flags: ${result.flags.length}`);
    console.log(`Detected Pennants: ${result.pennants.length}`);
    
    result.pennants.forEach(pn => {
        console.log(`- PENNANT: ${pn.name} (Level: ${pn.level}, Confidence: ${pn.confidence.toFixed(2)}%)`);
        console.log(`  Pole Start: ${pn.pole.start.index}, Pole End: ${pn.pole.end.index}`);
    });
}

runTest('random');
runTest('bull_pennant');
