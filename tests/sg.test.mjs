import assert from 'node:assert/strict';
import { calculateHoleSg } from '../src/domain/sg/calculateHoleSg.js';
import { calculateRoundSg } from '../src/domain/sg/calculateRoundSg.js';
import { getHoleExpected } from '../src/domain/sg/expectedHoles.js';
import { getPuttExpected } from '../src/domain/sg/expectedPutts.js';

function nearlyEqual(actual, expected, tolerance = 0.000001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} !== ${expected}`);
}

function assertHole(input, expected) {
  const result = calculateHoleSg(input);
  Object.entries(expected).forEach(([key, value]) => nearlyEqual(result[key], value));
}

assert.equal(getPuttExpected(9, 10), 2.05);
nearlyEqual(getPuttExpected(1.5, 10), 1.235);
nearlyEqual(getPuttExpected(5, 15), 1.85);
assert.equal(getPuttExpected(30, 10), 2.17);

assert.equal(getHoleExpected(4, 360, 10), 4.65);
nearlyEqual(getHoleExpected(4, 375, 10), 4.75);
nearlyEqual(getHoleExpected(4, 360, 15), 4.9);
assert.equal(getHoleExpected(3, 50, 10), 3.25);

assertHole(
  { par: 4, distanceM: 360, score: 4, putts: 2, firstPuttDistanceM: 9, handicapIndex: 10 },
  {
    holeExpected: 4.65,
    puttExpected: 2.05,
    strokesBeforePutting: 2,
    greenSg: 0.6,
    puttingSg: 0.05,
    totalSg: 0.65,
  },
);

assertHole(
  { par: 4, distanceM: 360, score: 4, putts: 1, firstPuttDistanceM: 2, handicapIndex: 10 },
  {
    holeExpected: 4.65,
    puttExpected: 1.35,
    strokesBeforePutting: 3,
    greenSg: 0.3,
    puttingSg: 0.35,
    totalSg: 0.65,
  },
);

assertHole(
  { par: 4, distanceM: 360, score: 5, putts: 3, firstPuttDistanceM: 15, handicapIndex: 10 },
  {
    holeExpected: 4.65,
    puttExpected: 2.17,
    strokesBeforePutting: 2,
    greenSg: 0.48,
    puttingSg: -0.83,
    totalSg: -0.35,
  },
);

const identityResult = calculateHoleSg({
  par: 5,
  distanceM: 510,
  score: 6,
  putts: 2,
  firstPuttDistanceM: 7.5,
  handicapIndex: 20,
});
nearlyEqual(identityResult.greenSg + identityResult.puttingSg, identityResult.holeExpected - 6);

const missingDistance = calculateHoleSg({
  par: 4,
  distanceM: 330,
  score: 5,
  putts: 2,
  firstPuttDistanceM: null,
  handicapIndex: 10,
});
assert.equal(missingDistance.greenSg, null);
assert.equal(missingDistance.puttingSg, null);
nearlyEqual(missingDistance.totalSg, -0.5);
assert.equal(missingDistance.confidence, 'LOW');

const zeroPutt = calculateHoleSg({
  par: 4,
  distanceM: 330,
  score: 3,
  putts: 0,
  firstPuttDistanceM: null,
  handicapIndex: 10,
});
nearlyEqual(zeroPutt.greenSg, 1.5);
assert.equal(zeroPutt.puttingSg, 0);
assert.equal(zeroPutt.reasonCode, 'HOLED_OUT_OFF_GREEN');

assert.throws(
  () => calculateHoleSg({ par: 4, distanceM: 330, score: 4, putts: 5, firstPuttDistanceM: 2, handicapIndex: 10 }),
  /PUTTS_OVER_SCORE/,
);

const round = calculateRoundSg(
  [
    { holeNo: 1, par: 4, distanceM: 360, score: 4, putts: 2, firstPuttDistanceM: 9 },
    { holeNo: 2, par: 4, distanceM: 360, score: 5, putts: 3, firstPuttDistanceM: 15 },
  ],
  10,
);
nearlyEqual(round.summary.greenSg, 1.08);
nearlyEqual(round.summary.puttingSg, -0.78);
nearlyEqual(round.summary.totalSg, 0.3);

console.log('All SG Lite tests passed');
