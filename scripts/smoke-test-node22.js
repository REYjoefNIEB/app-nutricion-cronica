'use strict';
const path = require('path');

console.log('=== Smoke test Node.js 22 migration ===');
console.log(`Running on Node ${process.version}`);
console.log('');

let totalFailed = 0;

// Test 1: HIrisPlex module
console.log('--- Test 1: HIrisPlex module ---');
try {
    const hirisplex = require(path.join(__dirname, '..', 'functions', 'traits', 'hirisplex'));
    console.log('✅ Module loaded');
    console.log('  Exports:', Object.keys(hirisplex).join(', '));
} catch (e) {
    console.error('❌ Failed to load hirisplex:', e.message);
    totalFailed++;
}

// Test 2: encryption module
console.log('');
console.log('--- Test 2: encryption module ---');
try {
    const encryption = require(path.join(__dirname, '..', 'functions', 'security', 'encryption'));
    console.log('✅ Module loaded');

    const dummyKey = Buffer.alloc(32).toString('base64');
    const testData = { hello: 'world', snps: { rs12913832: 'AG' } };
    const testUid  = 'test-user-smoke';

    const encrypted = encryption.encryptGeneticData(testData, testUid, dummyKey);
    const decrypted = encryption.decryptGeneticData(encrypted, testUid, dummyKey);

    if (decrypted.hello === 'world' && decrypted.snps.rs12913832 === 'AG') {
        console.log('✅ encrypt/decrypt roundtrip works');
    } else {
        console.error('❌ encrypt/decrypt roundtrip broken:', decrypted);
        totalFailed++;
    }
} catch (e) {
    console.error('❌ Failed encryption test:', e.message);
    totalFailed++;
}

// Test 3: predictEyeColor — GEroe validated vector [1,0,2,1,0,1] → P(brown)≈77.8%
console.log('');
console.log('--- Test 3: predictEyeColor (GEroe validated genotypes) ---');
try {
    const { predictEyeColor } = require(path.join(__dirname, '..', 'functions', 'traits', 'hirisplex'));
    const geroeGenos = {
        rs12913832: 'AG',  // count=1 G
        rs1800407:  'CC',  // count=0 A
        rs12896399: 'TT',  // count=2 T
        rs16891982: 'CG',  // count=1 G
        rs1393350:  'GG',  // count=0 A
        rs12203592: 'CT',  // count=1 T
    };
    const result = predictEyeColor(geroeGenos);
    const brownPct = result?.probabilities?.brown;

    if (brownPct !== undefined && Math.abs(brownPct - 77.8) <= 5.0) {
        console.log(`✅ GEroe brown = ${brownPct}% (esperado 77.8% ±5%)`);
    } else {
        console.error(`❌ GEroe brown = ${brownPct} (esperado ~77.8%)`);
        totalFailed++;
    }
} catch (e) {
    console.error('❌ Failed predictEyeColor test:', e.message);
    totalFailed++;
}

console.log('');
if (totalFailed > 0) {
    console.log(`🔴 ${totalFailed}/3 tests fallaron — NO deployar`);
    process.exit(1);
} else {
    console.log(`🎉 3/3 smoke tests pasan en Node ${process.version}`);
    process.exit(0);
}
