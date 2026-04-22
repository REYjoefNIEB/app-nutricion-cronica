#!/usr/bin/env node
/**
 * Enriquece los 141 AIMs del panel CLG con frecuencias alélicas por sub-población
 * desde Ensembl REST API (1000 Genomes Phase 3).
 *
 * AMR_NAT usa PEL (Peruvians from Lima) como proxy amerindio.
 * Ver documentacion/TODO-upgrade-amerindian-refdata.md para upgrade futuro con AYM/MAP.
 */
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const INPUT      = path.join(__dirname, '01-aims-parsed.json');
const OUTPUT     = path.join(__dirname, '02-aims-with-populations.json');
const ERRORS_LOG = path.join(__dirname, '02-fetch-errors.log');

// Sub-poblaciones Nura → códigos 1000G en Ensembl
const POP_MAPPING = {
    EUR_N:   ['1000GENOMES:phase_3:CEU', '1000GENOMES:phase_3:GBR', '1000GENOMES:phase_3:FIN'],
    EUR_S:   ['1000GENOMES:phase_3:TSI', '1000GENOMES:phase_3:IBS'],
    AFR_W:   ['1000GENOMES:phase_3:YRI', '1000GENOMES:phase_3:GWD', '1000GENOMES:phase_3:MSL', '1000GENOMES:phase_3:ESN'],
    AFR_E:   ['1000GENOMES:phase_3:LWK'],
    EAS_CN:  ['1000GENOMES:phase_3:CHB', '1000GENOMES:phase_3:CHS'],
    EAS_JP:  ['1000GENOMES:phase_3:JPT'],
    SAS:     ['1000GENOMES:phase_3:GIH', '1000GENOMES:phase_3:BEB', '1000GENOMES:phase_3:ITU', '1000GENOMES:phase_3:STU', '1000GENOMES:phase_3:PJL'],
    AMR_NAT: ['1000GENOMES:phase_3:PEL']  // proxy: ~77% amerindio andino
};

const ALL_POP_KEYS = Object.keys(POP_MAPPING);

function fetchEnsembl(rsid) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'rest.ensembl.org',
            path:     `/variation/human/${rsid}?pops=1;content-type=application/json`,
            method:   'GET',
            headers:  { 'User-Agent': 'NURA-research/2.0', 'Content-Type': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 429) {
                    resolve({ _rateLimited: true });
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ _parseError: e.message, _raw: data.substring(0, 100) });
                }
            });
        });

        req.on('error', e => resolve({ _networkError: e.message }));
        req.setTimeout(15000, () => { req.destroy(); resolve({ _timeout: true }); });
        req.end();
    });
}

function extractFrequencies(ensemblData, minorAllele) {
    const pops = ensemblData.populations || [];
    const result = {};

    for (const [nuraCode, ensemblCodes] of Object.entries(POP_MAPPING)) {
        // Buscar entradas para este alelo en estas poblaciones
        const forMinor = pops.filter(p =>
            ensemblCodes.includes(p.population) && p.allele === minorAllele
        );

        if (forMinor.length > 0) {
            result[nuraCode] = forMinor.reduce((s, m) => s + m.frequency, 0) / forMinor.length;
        } else {
            // Verificar si Ensembl tiene CUALQUIER dato para estas poblaciones
            const hasAnyEntry = pops.some(p => ensemblCodes.includes(p.population));
            result[nuraCode] = hasAnyEntry ? 0.0 : null;
        }
    }

    return result;
}

async function fetchWithRetry(rsid, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const data = await fetchEnsembl(rsid);

        if (data._rateLimited) {
            console.log(`  ⏳ Rate limit — esperando 60s... (intento ${attempt}/${maxRetries})`);
            await new Promise(r => setTimeout(r, 60000));
            continue;
        }
        if (data._timeout || data._networkError || data._parseError) {
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 3000 * attempt));
                continue;
            }
            return { ok: false, error: data._timeout ? 'timeout' : (data._networkError || data._parseError) };
        }
        return { ok: true, data };
    }
    return { ok: false, error: 'max retries exceeded' };
}

async function main() {
    const aims = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
    const results = [];
    const errors  = [];

    // Reanudar si OUTPUT ya existe (permite resumir si se interrumpe)
    const existing = new Map();
    if (fs.existsSync(OUTPUT)) {
        const prev = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
        for (const r of prev) existing.set(r.rsid, r);
        console.log(`♻️  Reanudando — ${existing.size} AIMs ya procesados.\n`);
    }

    console.log(`Iniciando fetch para ${aims.length} AIMs (~${Math.ceil(aims.length * 0.25 / 60)} min).\n`);

    const t0 = Date.now();

    for (let i = 0; i < aims.length; i++) {
        const aim = aims[i];

        // Reusar dato existente si ya se descargó
        if (existing.has(aim.rsid)) {
            results.push(existing.get(aim.rsid));
            process.stdout.write(`[${i + 1}/${aims.length}] ${aim.rsid} (cached)\n`);
            continue;
        }

        const { ok, data, error } = await fetchWithRetry(aim.rsid);

        if (!ok) {
            console.log(`[${i + 1}/${aims.length}] ${aim.rsid}: ❌ ${error}`);
            errors.push({ rsid: aim.rsid, error });
            results.push({ ...aim, frequencies: null, fetchError: error });
        } else {
            const freqs = extractFrequencies(data, aim.minorAllele);
            const withData = Object.values(freqs).filter(v => v !== null).length;
            const allNulls = Object.values(freqs).every(v => v === null);

            // Si Ensembl no reporta minor_allele, podría estar en strand complementario
            const ensemblMinor = data.minor_allele;
            let freqNote = null;
            if (ensemblMinor && ensemblMinor !== aim.minorAllele) {
                freqNote = `Ensembl minor=${ensemblMinor} vs CLG minor=${aim.minorAllele} — frecuencias son de CLG A1`;
            }

            process.stdout.write(`[${i + 1}/${aims.length}] ${aim.rsid}: ${withData}/8 pops`);
            if (freqNote) process.stdout.write(` (⚠️ ${freqNote})`);
            if (allNulls) process.stdout.write(' ❌ sin datos');
            process.stdout.write('\n');

            results.push({
                ...aim,
                MAF_global_ensembl: data.MAF ?? null,
                minorAllele_ensembl: data.minor_allele ?? null,
                alleleMismatch: freqNote,
                frequencies: freqs
            });
        }

        // Guardar progreso cada 10 AIMs (permite resumir si se interrumpe)
        if ((i + 1) % 10 === 0) {
            fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
        }

        // Rate limit conservador: ~4 req/s
        await new Promise(r => setTimeout(r, 250));
    }

    // Guardar final
    fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
    fs.writeFileSync(ERRORS_LOG, JSON.stringify(errors, null, 2));

    const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
    const completos = results.filter(r => r.frequencies && Object.values(r.frequencies).every(v => v !== null)).length;
    const parciales = results.filter(r => r.frequencies && Object.values(r.frequencies).some(v => v === null)).length;

    console.log('\n' + '═'.repeat(50));
    console.log('RESUMEN 02-fetch-ensembl-populations');
    console.log('═'.repeat(50));
    console.log(`Total AIMs procesados: ${results.length}`);
    console.log(`✅ Completos (8/8 poblaciones): ${completos}`);
    console.log(`⚠️  Parciales (1-7/8 pops):      ${parciales}`);
    console.log(`❌ Sin datos / errores:           ${errors.length}`);
    console.log(`⏱  Tiempo: ${elapsed} min`);
    console.log(`\nArchivos:`);
    console.log(`  ${OUTPUT}`);
    console.log(`  ${ERRORS_LOG}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
