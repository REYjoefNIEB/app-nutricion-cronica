'use strict';
/**
 * run-hirisplex-oracle.js
 *
 * POSTs each query from hirisplex_oracle_queries.csv to predict_phenotype.php.
 * Parses hair probabilities from HTML response.
 * Respects server with 600ms pause between requests.
 * Aborts on 5 consecutive failures.
 *
 * Output: scripts/validation-data/hirisplex_oracle_results.json
 */
const path  = require('path');
const fs    = require('fs');
const https = require('https');

const QUERY_CSV  = path.join(__dirname, 'validation-data', 'hirisplex_oracle_queries.csv');
const OUT_JSON   = path.join(__dirname, 'validation-data', 'hirisplex_oracle_results.json');
const DELAY_MS   = 600;
const TIMEOUT_MS = 12000;
const MAX_CONSEC = 5;

function parseHairProbs(html) {
    const map = {};
    const re  = /<th>([^<]+)<\/th><td>([\d.]+)<\/td>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const label = m[1].trim().toLowerCase();
        const val   = parseFloat(m[2]);
        if (label === 'blond hair')  map.blond = val;
        if (label === 'brown hair')  map.brown = val;
        if (label === 'red hair')    map.red   = val;
        if (label === 'black hair')  map.black = val;
    }
    return map;
}

function postQuery(csvLine, predictionID) {
    return new Promise((resolve, reject) => {
        const body = new URLSearchParams({
            input_csv:    csvLine,
            type:         'hirisplexs',
            predictionID,
        }).toString();

        const req = https.request({
            hostname: 'hirisplex.erasmusmc.nl',
            path:     '/predict_phenotype.php',
            method:   'POST',
            headers:  {
                'Content-Type':   'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
                'User-Agent':     'Mozilla/5.0 (research-audit)',
            },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });

        req.setTimeout(TIMEOUT_MS, () => { req.destroy(); reject(new Error('timeout')); });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    const lines   = fs.readFileSync(QUERY_CSV, 'utf8').trim().split('\n');
    const header  = lines[0];
    const queries = lines.slice(1);

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  run-hirisplex-oracle.js — POST oracle to webtool           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`  ${queries.length} queries | delay=${DELAY_MS}ms | timeout=${TIMEOUT_MS}ms\n`);

    const results   = {};
    let consecutive = 0;

    for (let i = 0; i < queries.length; i++) {
        const row      = queries[i];
        const sampleid = row.split(',')[0];
        const csvInput = header + '\n' + row;
        const predID   = `oracle_${Date.now()}_${i}`;

        let success = false;

        for (let attempt = 0; attempt < 2 && !success; attempt++) {
            try {
                if (attempt > 0) await sleep(1500);
                const html  = await postQuery(csvInput, predID);
                if (!html.includes(predID)) throw new Error('predictionID not in response');
                const hair  = parseHairProbs(html);
                if (hair.black === undefined) throw new Error('parse failed — missing black hair');
                results[sampleid] = hair;
                success    = true;
                consecutive = 0;
                console.log(`[${String(i + 1).padStart(2)}/${queries.length}] ${sampleid.padEnd(38)} blond=${hair.blond} brown=${hair.brown} red=${hair.red} black=${hair.black}`);
            } catch (e) {
                if (attempt === 1) {
                    consecutive++;
                    console.error(`❌ [${i + 1}] ${sampleid}: ${e.message} (consec=${consecutive})`);
                    results[sampleid] = null;
                }
            }
        }

        if (consecutive >= MAX_CONSEC) {
            console.error(`\n🔴 ${MAX_CONSEC} consecutive failures — STOPPING. Possible rate limit or endpoint change.`);
            break;
        }

        if (i < queries.length - 1) await sleep(DELAY_MS);
    }

    fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));

    const total   = Object.keys(results).length;
    const nulls   = Object.values(results).filter(v => v === null).length;
    const succPct = (((total - nulls) / total) * 100).toFixed(1);

    console.log(`\n════════════════════════════════════════════════════════════════`);
    console.log(`  ${total - nulls}/${total} successful (${succPct}%) → ${OUT_JSON}`);
    if (nulls > 0) console.log(`  ⚠  ${nulls} failed queries — check results JSON`);
    if ((total - nulls) / total < 0.95) {
        console.log(`\n🔴 Success rate < 95% — results may be unreliable for audit`);
        process.exit(1);
    }
    console.log(`\n✅ DONE — proceed with validate-hirisplex-linearity.js`);
}

main().catch(e => { console.error(e); process.exit(1); });
