'use strict';
/**
 * verify-rs12203592-blond-sign.js
 *
 * Verifica que el signo del coeficiente rs12203592 para BLOND sea negativo,
 * consistente con:
 *   - Branicki et al. 2011 (Hum Genet 129:443, PMC3057002, Table 2): β_blond = -1.29
 *   - Oracle audit del webtool HIrisPlex: β_blond ≈ -1.80 (mismo signo)
 *   - Biología: IRF4 alelo T asociado a cabello claro (fair/blond) — reduce P(blond) vs P(black)
 *     como categoría de referencia en el modelo multinomial logit.
 */
const path = require('path');
const { predictHairColor } = require(path.join(__dirname, '..', 'functions', 'traits', 'hirisplex'));

// Acceder al coeficiente vía source parse (HAIR_COEFFICIENTS no se exporta directamente)
const fs  = require('fs');
const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'traits', 'hirisplex.js'), 'utf8');

const hairMatch = src.match(/const HAIR_COEFFICIENTS\s*=\s*(\{[\s\S]*?\n\});/);
if (!hairMatch) { console.error('Cannot find HAIR_COEFFICIENTS'); process.exit(1); }
const HAIR_COEFS = new Function('return ' + hairMatch[1])();

const actual = HAIR_COEFS.blond.betas.rs12203592;
const expected_branicki = -1.29;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  verify-rs12203592-blond-sign.js                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log(`  rs12203592 blond β actual  : ${actual}`);
console.log(`  Expected (Branicki 2011)   : ${expected_branicki}`);
console.log(`  Expected sign              : NEGATIVE\n`);

const signOk = actual < 0;
const valueOk = Math.abs(actual - expected_branicki) < 0.001;

console.log(`  Sign check  : ${signOk  ? '✅ PASS' : '❌ FAIL — coefficient must be negative'}`);
console.log(`  Value check : ${valueOk ? '✅ PASS' : `❌ FAIL — expected ${expected_branicki}, got ${actual}`}`);

// Additional sanity: GEroe genotype (rs12203592=CT → T count=1)
// With correct negative sign, T allele should push DOWN blond probability
const geroe_only12203592 = { rs12203592: 'CT' };
const result = predictHairColor(geroe_only12203592);
if (result) {
    console.log(`\n  GEroe rs12203592=CT (T=1) prediction (all other SNPs missing):`);
    console.log(`    blond=${result.probabilities.blond}%  brown=${result.probabilities.brown}%  black=${result.probabilities.black}%`);
}

if (!signOk || !valueOk) {
    console.log('\n🔴 FAIL');
    process.exit(1);
}
console.log('\n✅ PASS');
process.exit(0);
