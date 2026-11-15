// Run with:  node --test backend/tests/efScoring.test.js
// Guards the documented limits of the executive-function (UEF-1) scoring:
//   - exactly ONE dimension is exact (Organization of Tasks), six are partial
//   - there is NO overall EF score
//   - input is strictly validated (1-5 integers, every required item present)

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DIMENSIONS,
  ALL_ITEMS,
  EFValidationError,
  scoreAll,
} = require('../scoring/executiveFunctionScoring');

const EXACT_DIMENSION = 'Organizacionelemnetostareas';

function allAnswers(value) {
  return Object.fromEntries(ALL_ITEMS.map((item) => [item, value]));
}

test('there are seven dimensions: exactly one exact, six partial', () => {
  const names = Object.keys(DIMENSIONS);
  assert.equal(names.length, 7);

  const exact = names.filter((n) => DIMENSIONS[n].status === 'exact');
  const partial = names.filter((n) => DIMENSIONS[n].status === 'partial');
  assert.deepEqual(exact, [EXACT_DIMENSION]);
  assert.equal(partial.length, 6);
});

test('no item belongs to two dimensions', () => {
  const total = Object.values(DIMENSIONS).reduce((sum, d) => sum + d.items.length, 0);
  assert.equal(ALL_ITEMS.length, total);
});

test('there is deliberately no overall EF score', () => {
  const result = scoreAll(allAnswers(3));
  assert.equal(result.overallScore, null);
  assert.deepEqual(Object.keys(result).sort(), ['dimensions', 'overallScore']);
});

test('scoreAll returns every dimension with its status', () => {
  const { dimensions } = scoreAll(allAnswers(3));
  assert.equal(Object.keys(dimensions).length, 7);
  assert.equal(dimensions[EXACT_DIMENSION].status, 'exact');
  Object.keys(dimensions)
    .filter((n) => n !== EXACT_DIMENSION)
    .forEach((n) => assert.equal(dimensions[n].status, 'partial', n));
});

test('only partial dimensions carry the "partial recovery" note', () => {
  const { dimensions } = scoreAll(allAnswers(3));
  assert.equal(dimensions[EXACT_DIMENSION].note, null);
  Object.keys(dimensions)
    .filter((n) => n !== EXACT_DIMENSION)
    .forEach((n) => assert.match(dimensions[n].note, /Partial recovery/, n));
});

test('normalised scores: all 1s -> 0, all 3s -> 50, all 5s -> 100', () => {
  [
    [1, 0],
    [3, 50],
    [5, 100],
  ].forEach(([answer, expected]) => {
    const { dimensions } = scoreAll(allAnswers(answer));
    Object.values(dimensions).forEach((d) => {
      assert.equal(d.normalized0to100, expected, `${d.name} with all ${answer}s`);
    });
  });
});

test('exact dimension: known mixed answers give the expected score', () => {
  // Organization of Tasks uses EF1, EF6, EF7, EF37.
  const answers = allAnswers(3);
  answers.EF1 = 1;
  answers.EF6 = 2;
  answers.EF7 = 3;
  answers.EF37 = 4;

  const org = scoreAll(answers).dimensions[EXACT_DIMENSION];
  assert.deepEqual(org.itemsUsed, ['EF1', 'EF6', 'EF7', 'EF37']);
  assert.equal(org.rawScore, 10);
  assert.equal(org.meanScore, 2.5);
  assert.equal(org.normalized0to100, 37.5); // (10 - 4) / (20 - 4) * 100
});

test('validation: a missing item is rejected and named', () => {
  const answers = allAnswers(3);
  delete answers.EF10;
  assert.throws(
    () => scoreAll(answers),
    (err) => err instanceof EFValidationError && /EF10/.test(err.message)
  );
});

test('validation: out-of-range, decimal and string answers are rejected', () => {
  [0, 6, 2.5, '3', null, NaN].forEach((bad) => {
    const answers = allAnswers(3);
    answers.EF1 = bad;
    assert.throws(() => scoreAll(answers), EFValidationError, `value ${String(bad)}`);
  });
});

test('extra unknown keys are ignored, not scored', () => {
  const answers = { ...allAnswers(3), EF999: 5 };
  const { dimensions } = scoreAll(answers);
  assert.equal(Object.keys(dimensions).length, 7);
});