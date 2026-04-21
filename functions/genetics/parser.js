/**
 * Parser Universal de Archivos de ADN
 * Soporta: 23andMe, AncestryDNA, MyHeritage
 */

function detectFormat(fileContent) {
  const firstLines = fileContent.split('\n').slice(0, 20).join('\n').toLowerCase();
  if (firstLines.includes('23andme')) return '23andme';
  if (firstLines.includes('ancestrydna') || firstLines.includes('ancestry.com')) return 'ancestry';
  if (firstLines.includes('myheritage')) return 'myheritage';

  const lines = fileContent.split('\n');
  const dataLine = lines.find(l => l.startsWith('rs') && !l.startsWith('#'));
  if (dataLine) {
    const columns = dataLine.split('\t').length;
    if (columns === 4) return '23andme';
    if (columns === 5) return 'ancestry';
  }
  return 'unknown';
}

function parse23andMe(fileContent) {
  const snps = {};
  const lines = fileContent.split('\n');
  let processed = 0, skipped = 0;

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') { skipped++; continue; }
    const parts = line.split('\t');
    if (parts.length < 4) { skipped++; continue; }
    const [rsid, chromosome, position, genotype] = parts;
    if (!rsid.startsWith('rs') && !rsid.startsWith('i')) { skipped++; continue; }
    const cleanGenotype = genotype.trim().toUpperCase();
    if (cleanGenotype === '--' || cleanGenotype === '') { skipped++; continue; }
    snps[rsid] = { chromosome: chromosome.trim(), position: position.trim(), genotype: cleanGenotype };
    processed++;
  }
  return { snps, metadata: { format: '23andme', totalProcessed: processed, totalSkipped: skipped, totalSnps: Object.keys(snps).length } };
}

function parseAncestry(fileContent) {
  const snps = {};
  const lines = fileContent.split('\n');
  let processed = 0, skipped = 0;

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('rsid')) { skipped++; continue; }
    const parts = line.split('\t');
    if (parts.length < 5) { skipped++; continue; }
    const [rsid, chromosome, position, allele1, allele2] = parts;
    if (!rsid.startsWith('rs')) { skipped++; continue; }
    const genotype = (allele1.trim() + allele2.trim()).toUpperCase();
    if (genotype === '00' || genotype.includes('0') || genotype === '') { skipped++; continue; }
    snps[rsid] = { chromosome: chromosome.trim(), position: position.trim(), genotype };
    processed++;
  }
  return { snps, metadata: { format: 'ancestry', totalProcessed: processed, totalSkipped: skipped, totalSnps: Object.keys(snps).length } };
}

function parseMyHeritage(fileContent) {
  const snps = {};
  const lines = fileContent.split('\n');
  let processed = 0, skipped = 0;

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('RSID')) { skipped++; continue; }
    const parts = line.includes(',') ? line.split(',') : line.split('\t');
    if (parts.length < 4) { skipped++; continue; }
    const [rsid, chromosome, position, genotype] = parts;
    const cleanRsid = rsid.replace(/"/g, '').trim();
    if (!cleanRsid.startsWith('rs')) { skipped++; continue; }
    const cleanGenotype = genotype.replace(/"/g, '').trim().toUpperCase();
    if (cleanGenotype === '--' || cleanGenotype === '') { skipped++; continue; }
    snps[cleanRsid] = {
      chromosome: chromosome.replace(/"/g, '').trim(),
      position: position.replace(/"/g, '').trim(),
      genotype: cleanGenotype
    };
    processed++;
  }
  return { snps, metadata: { format: 'myheritage', totalProcessed: processed, totalSkipped: skipped, totalSnps: Object.keys(snps).length } };
}

function parseDNAFile(fileContent) {
  if (!fileContent || typeof fileContent !== 'string') throw new Error('Archivo inválido');
  if (fileContent.length < 1000) throw new Error('Archivo demasiado pequeño');
  if (fileContent.length > 50 * 1024 * 1024) throw new Error('Archivo demasiado grande (máx 50MB)');

  const format = detectFormat(fileContent);
  let result;
  switch (format) {
    case '23andme':   result = parse23andMe(fileContent);   break;
    case 'ancestry':  result = parseAncestry(fileContent);  break;
    case 'myheritage':result = parseMyHeritage(fileContent);break;
    default:
      result = parse23andMe(fileContent);
      if (result.metadata.totalSnps < 1000) {
        throw new Error('Formato no reconocido. Usa 23andMe, AncestryDNA o MyHeritage');
      }
  }

  if (result.metadata.totalSnps < 100000) {
    throw new Error(`Pocos SNPs detectados (${result.metadata.totalSnps}). Se requieren 500,000+`);
  }
  return result;
}

function extractRelevantSNPs(allSnps, nuraDatabase) {
  const relevant = {};
  for (const rsid of Object.keys(nuraDatabase)) {
    if (allSnps[rsid]) relevant[rsid] = allSnps[rsid];
  }
  return {
    relevantSnps: relevant,
    foundCount: Object.keys(relevant).length,
    searchedCount: Object.keys(nuraDatabase).length,
    coveragePercent: (Object.keys(relevant).length / Object.keys(nuraDatabase).length * 100).toFixed(1)
  };
}

module.exports = { parseDNAFile, parse23andMe, parseAncestry, parseMyHeritage, detectFormat, extractRelevantSNPs };
