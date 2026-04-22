# Scripts de Test — NURA

## Test #1 — Ancestry Personalization

Valida que el algoritmo EM produce vectores de ancestría distintos para ADNs genéticamente diferentes.

### Setup inicial (una sola vez)

**1. Service Account JSON**

```
https://console.firebase.google.com/project/nura-33fc1/settings/serviceaccounts/adminsdk
```

Click "Generate new private key" → guardar como `scripts/nura-33fc1-service-account.json`.

**2. Web API Key**

Firebase Console → Project Settings → General → Web API Key (empieza con `AIzaSy...`)

```bash
cp scripts/.env.example scripts/.env
# Editar scripts/.env y pegar la key
```

**3. Archivos ADN de referencia**

- `scripts/test-data/adn-A-corpas-padre.txt`
  - Dataset Corpas padre (español andaluz), figshare dataset 92682
  - URL: https://figshare.com/articles/dataset/92682
  - Descargar el archivo .txt compatible con 23andMe y renombrarlo

- `scripts/test-data/adn-B-sporny.txt`
  - Manu Sporny (European American), repositorio público
  - URL: https://github.com/msporny/dna
  - Descargar `genome.txt` y renombrar a `adn-B-sporny.txt`

### Ejecutar Test #1

```bash
# Desde la raíz del repositorio
node scripts/test1-runner.js
```

El runner carga automáticamente `scripts/.env` si existe.

**PowerShell (alternativa):**

```powershell
$env:FIREBASE_WEB_API_KEY = "AIzaSy..."
node scripts/test1-runner.js
```

### Qué hace el runner

1. Crea 2 usuarios de test temporales en Firebase Auth
2. Sube cada ADN a Storage en `genetic-raw/{uid}/...`
3. Invoca `processGeneticData` para parsear y guardar el perfil genético
4. Invoca `analyzeAncestry` para ejecutar el algoritmo EM
5. Lee los Q-vectores resultantes de Firestore
6. Captura los logs `[ANCESTRY]` de Cloud Functions
7. Calcula la distancia L2 entre los dos Q-vectores
8. Genera un reporte YAML en `scripts/test-results/`
9. Limpia todos los datos de test (Auth + Firestore + Storage)

### Veredictos posibles

| Veredicto | Significado |
|-----------|-------------|
| `PASS` | Test superado — fingerprint OK, L2 ≥ 0.05 |
| `FAIL_DIAGNOSIS_A` | Q inicial idéntico — inicialización determinista rota |
| `FAIL_DIAGNOSIS_C` | Parser extrae < 8 AIMs — problema de formato ADN |
| `FAIL_DIAGNOSIS_D` | Q final idéntico / L2 < 0.05 — EM converge al mismo punto |
| `FAIL_INTERNAL_ERROR` | Error en Cloud Functions — ver logs en test-results/ |

### Debug

```bash
DEBUG=true node scripts/test1-runner.js
```

### Notas importantes

- El script crea y elimina 2 usuarios reales en Firebase Auth. No afecta datos de usuarios reales.
- Los logs de Cloud Functions se capturan con `firebase functions:log` (requiere estar autenticado con `firebase login`).
- Los archivos de resultados en `test-results/` están en `.gitignore` — no se commitean.
- Si `processGeneticData` falla por cobertura insuficiente de SNPs, el archivo ADN puede no tener el formato correcto o no contener los ~26 SNPs AIM necesarios.
