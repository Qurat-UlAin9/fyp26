/**
 * Executive Function (EF) scoring — pure arithmetic, no trained model.
 *
 * Unlike ADHD/ASRS detection (RandomForest, needs Python + .pkl files),
 * EF scoring is just summing specific items per dimension. No ML service
 * round-trip needed — this runs directly in the Node backend.
 *
 * STATUS: Organizacionelemnetostareas is exact (validated against the source
 * SPSS composite across all 1,373 rows in the UEF-1 dataset, 0 residual).
 * The other six dimensions use item sets confirmed both by our own
 * regression/brute-force recovery AND by Table 4 of the published paper
 * (Ramos-Galarza et al., 2023, Frontiers in Psychology, UEF-1 scale), but
 * cannot be reproduced exactly from this dataset -- see
 * EF_scoring_audit_report.md for the full evidence trail. Scores for those
 * six will read consistently a little below the published scale's norms.
 *
 * Never use this output to diagnose ADHD or any other condition.
 */

const LIKERT_MIN = 1;
const LIKERT_MAX = 5;

const DIMENSIONS = {
  SistemaAtencionalSupervisor: {
    items: ['EF10', 'EF15', 'EF17', 'EF19', 'EF27', 'EF39'],
    status: 'partial',
  },
  RegulacionDeliberadaEmocion: {
    items: ['EF4', 'EF34', 'EF40', 'EF42'],
    status: 'partial',
  },
  MonitorizacionConscieteResponsabilidades: {
    items: ['EF2', 'EF8', 'EF9', 'EF18', 'EF38'],
    status: 'partial',
  },
  Verificaciondelaconducta: {
    items: ['EF24', 'EF31', 'EF33', 'EF41'],
    status: 'partial',
  },
  Organizacionelemnetostareas: {
    items: ['EF1', 'EF6', 'EF7', 'EF37'],
    status: 'exact',
  },
  Controlinhibitorio: {
    items: ['EF3', 'EF11', 'EF20', 'EF21', 'EF22', 'EF23'],
    status: 'partial',
  },
  tomadedecisiones: {
    items: ['EF5', 'EF13', 'EF26'],
    status: 'partial',
  },
};

const ALL_ITEMS = [...new Set(Object.values(DIMENSIONS).flatMap((d) => d.items))].sort(
  (a, b) => Number(a.slice(2)) - Number(b.slice(2))
);

class EFValidationError extends Error {}

/**
 * @param {Record<string, number>} responses - e.g. { EF1: 3, EF2: 5, ... }
 * @throws {EFValidationError} if any required item is missing or out of range
 */
function validateResponses(responses) {
  const missing = ALL_ITEMS.filter((item) => !(item in responses));
  if (missing.length) {
    throw new EFValidationError(`Missing required EF item responses: ${missing.join(', ')}`);
  }

  const outOfRange = ALL_ITEMS.filter((item) => {
    const v = responses[item];
    return !Number.isInteger(v) || v < LIKERT_MIN || v > LIKERT_MAX;
  });
  if (outOfRange.length) {
    throw new EFValidationError(
      `Responses out of range [${LIKERT_MIN}-${LIKERT_MAX}] for items: ${outOfRange.join(', ')}`
    );
  }
}

function scoreDimension(name, responses) {
  const spec = DIMENSIONS[name];
  const n = spec.items.length;
  const raw = spec.items.reduce((sum, item) => sum + responses[item], 0);
  const theoreticalMin = n * LIKERT_MIN;
  const theoreticalMax = n * LIKERT_MAX;
  const normalized = (100 * (raw - theoreticalMin)) / (theoreticalMax - theoreticalMin);

  return {
    name,
    status: spec.status,
    itemsUsed: spec.items,
    rawScore: raw,
    meanScore: raw / n,
    nItems: n,
    theoreticalMin,
    theoreticalMax,
    normalized0to100: normalized,
    note:
      spec.status === 'partial'
        ? 'Partial recovery: 1-2 contributing item(s) from the original scale are not present ' +
          'in this dataset, so this score runs a few points below what the original instrument ' +
          'would report. Item membership itself is confirmed, not guessed.'
        : null,
  };
}

/**
 * Score all 7 EF dimensions from a flat { EFn: 1-5 } response map.
 * Does NOT compute an overall EF composite -- no validated formula for one exists.
 * Never produces or implies a diagnosis.
 */
function scoreAll(responses) {
  validateResponses(responses);
  const dimensions = {};
  for (const name of Object.keys(DIMENSIONS)) {
    dimensions[name] = scoreDimension(name, responses);
  }
  return { dimensions, overallScore: null };
}

module.exports = {
  DIMENSIONS,
  ALL_ITEMS,
  EFValidationError,
  validateResponses,
  scoreAll,
};
