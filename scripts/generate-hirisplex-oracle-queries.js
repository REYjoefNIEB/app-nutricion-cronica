'use strict';
const path = require('path');
const fs   = require('fs');

// 24 HIrisPlex hair SNPs (webtool column names) — Walsh 2011 panel
const HAIR_SNPS = [
    'rs312262906_A', 'rs11547464_A', 'rs885479_T',   'rs1805008_T',
    'rs1805005_T',   'rs1805006_A',  'rs1805007_T',  'rs1805009_C',
    'rs201326893_A', 'rs2228479_A',  'rs1110400_C',  'rs28777_C',
    'rs16891982_C',  'rs12821256_G', 'rs4959270_A',  'rs12203592_T',
    'rs1042602_T',   'rs1800407_A',  'rs2402130_G',  'rs12913832_T',
    'rs2378249_C',   'rs12896399_T', 'rs1393350_T',  'rs683_G',
];

// Full 41-SNP HIrisPlex-S header (webtool order)
const ALL_SNPS = [
    'rs312262906_A', 'rs11547464_A', 'rs885479_T',   'rs1805008_T',
    'rs1805005_T',   'rs1805006_A',  'rs1805007_T',  'rs1805009_C',
    'rs201326893_A', 'rs2228479_A',  'rs1110400_C',  'rs28777_C',
    'rs16891982_C',  'rs12821256_G', 'rs4959270_A',  'rs12203592_T',
    'rs1042602_T',   'rs1800407_A',  'rs2402130_G',  'rs12913832_T',
    'rs2378249_C',   'rs12896399_T', 'rs1393350_T',  'rs683_G',
    'rs3114908_T',   'rs1800414_C',  'rs10756819_G', 'rs2238289_C',
    'rs17128291_C',  'rs6497292_C',  'rs1129038_G',  'rs1667394_C',
    'rs1126809_A',   'rs1470608_A',  'rs1426654_G',  'rs6119471_C',
    'rs1545397_T',   'rs6059655_T',  'rs12441727_A', 'rs3212355_A',
    'rs8051733_C',
];

// Linearity check pairs (indices into HAIR_SNPS, both set to het=1)
const LINEAR_PAIRS = [
    [0,  19],   // rs312262906 + rs12913832 (HERC2)
    [13,  7],   // rs12821256 (KITLG) + rs1805009
    [12, 14],   // rs16891982 + rs4959270
];

function makeRow(id, overrides) {
    const vals = ALL_SNPS.map(s => (overrides[s] !== undefined ? overrides[s] : 0));
    return [id, ...vals].join(',');
}

const header = ['sampleid', ...ALL_SNPS].join(',');
const rows   = [header];

// Q0 — baseline (all zeros → extracts intercepts)
rows.push(makeRow('Q0_baseline', {}));

// Q1..Q24 — single-SNP heterozygote (count=1) → extracts betas
HAIR_SNPS.forEach((snp, i) => {
    const rsid = snp.split('_')[0];
    rows.push(makeRow(`Q${i + 1}_het_${rsid}`, { [snp]: 1 }));
});

// Q25..Q48 — single-SNP homozygote (count=2) → validates 2×beta linearity
HAIR_SNPS.forEach((snp, i) => {
    const rsid = snp.split('_')[0];
    rows.push(makeRow(`Q${i + 25}_hom_${rsid}`, { [snp]: 2 }));
});

// Q49..Q51 — two SNPs het simultaneously → validates inter-SNP additivity
LINEAR_PAIRS.forEach(([a, b], i) => {
    const sA = HAIR_SNPS[a], sB = HAIR_SNPS[b];
    const rA = sA.split('_')[0], rB = sB.split('_')[0];
    rows.push(makeRow(`Q${49 + i}_linear_${rA}_${rB}`, { [sA]: 1, [sB]: 1 }));
});

const outPath = path.join(__dirname, 'validation-data', 'hirisplex_oracle_queries.csv');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, rows.join('\n') + '\n');
console.log(`✅ Generated ${rows.length - 1} queries → ${outPath}`);
console.log(`   Q0=baseline  Q1-Q24=het  Q25-Q48=hom  Q49-Q51=linearity`);
