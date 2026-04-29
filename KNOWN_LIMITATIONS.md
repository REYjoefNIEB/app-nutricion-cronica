# Known Limitations

Public registry of known limitations in Nura's clinical/genetic modules.
Each entry documents: status, severity, affected profiles, root cause,
workaround, next steps, and related artifacts.

A limitation is recorded here when:
- The behavior is suboptimal but not a bug (model can't reach a stricter target).
- The fix is non-trivial (would require new data, infrastructure, or research).
- A future developer (human or AI) needs to understand the trade-off before
  re-working the affected area.

If you're considering re-touching a module listed here, **read its entry first**
to avoid duplicating prior analysis.

---

## Hair Color (HIrisPlex)

**Status**: `validated: false` (Sprint 39c, 2026-04-28)
**Severity**: Low — top-1 prediction correct in 2/3 real validation profiles + 7/10 holdout

### Issue
The Walsh 2014 hair coefficients were re-calibrated against the official HIrisPlex
webtool (https://hirisplex.erasmusmc.nl/) using Adam optimizer with L2
regularization, achieving substantial improvement (top-1 30% → 70% on holdout).

However, a residual systematic bias **brown → black** remains in profiles where
the webtool predicts black as marginal top-1 (i.e., black slightly > brown).
The calibration tends to keep brown as top-1 in these borderline cases.

### Affected profiles (validation)
- ✅ Kenneth Reitz: brown top-1 correct (Nura: 57.5% / webtool: 54.3%)
- ✅ Bastian Greshake: brown top-1 correct (Nura: 67.1% / webtool: 63.9%)
- ❌ James Bradach: brown top-1 (Nura: 78.5%) when webtool predicts black
  top-1 (58.8%). MaxErr ~41%.

### Root cause
Adam with L2 regularization vs Walsh 2014 warm-start cannot reach the larger
beta values that the modern webtool (re-trained with n=1878) uses for
brown→black transitions. Pushing further would require either (a) more
training data with black-dominant profiles, or (b) reducing L2 regularization
which risks overfitting in MC1R rare variants.

The webtool itself has limited black sensitivity (33% per published metrics,
AUC 0.86 vs 0.94 for eye color) — replicating it perfectly is bounded by
inherent reference model uncertainty.

### Workaround
None at user-facing level. The result card displays the calibrated probabilities
correctly. The `validated: false` flag and `source` field document the limitation
for any future audits. Magnitudes are within reasonable range (no clinically
misleading predictions).

### Next steps (if revisited)
1. Generate ~25-50 additional ground-truth points with **black-dominant
   profiles** (HERC2=2 + multiple darkening SNPs simultaneously). This
   requires manual upload to the webtool (~1.5-2h work).
2. Retrain with the augmented dataset. Expect: black top-1 sensitivity to
   improve at potential cost of red precision.
3. Consider implementing a brown/black tie-breaker heuristic based on HERC2
   + TYR + SLC24A4 combined dosage.

### Related artifacts
- Calibration script: `scripts/calibrate-hair-full.js` (untracked)
- Dataset: `dna-test-data/hair-calibration-75/dataset.json` (untracked)
- Ground-truth CSVs: `dna-test-data/hair-calibration-75/*.csv` (untracked)
- Tests: `scripts/test-hair-color-calibration.js` (committed, 172/204 pass)
- Production code: `functions/traits/hirisplex.js` HAIR_COEFFICIENTS section
- Sprint history: 33→37→38→38b→39→39b→39c (2026-04-28)
- Stable tag: `v-stable-2026-04-28b`

---
