import { calculateHoleSg } from '../src/domain/sg/calculateHoleSg.js';
import { calculateRoundSg } from '../src/domain/sg/calculateRoundSg.js';
import { getHoleExpected } from '../src/domain/sg/expectedHoles.js';
import { getPuttExpected } from '../src/domain/sg/expectedPutts.js';

const result = document.querySelector('#result');
const checks = [];

function nearlyEqual(actual, expected, tolerance = 0.000001) {
  return Math.abs(actual - expected) <= tolerance;
}

function check(name, passed) {
  checks.push({ name, passed });
}

const goodGir = calculateHoleSg({
  par: 4,
  distanceM: 360,
  score: 4,
  putts: 2,
  firstPuttDistanceM: 9,
  handicapIndex: 10,
});

const longBogey = calculateHoleSg({
  par: 4,
  distanceM: 360,
  score: 5,
  putts: 3,
  firstPuttDistanceM: 15,
  handicapIndex: 10,
});

const missingDistance = calculateHoleSg({
  par: 4,
  distanceM: 330,
  score: 5,
  putts: 2,
  firstPuttDistanceM: null,
  handicapIndex: 10,
});

const zeroPutt = calculateHoleSg({
  par: 4,
  distanceM: 330,
  score: 3,
  putts: 0,
  firstPuttDistanceM: null,
  handicapIndex: 10,
});

let invalidPutts = false;
try {
  calculateHoleSg({ par: 4, distanceM: 330, score: 4, putts: 5, firstPuttDistanceM: 2, handicapIndex: 10 });
} catch (error) {
  invalidPutts = error.codes.includes('PUTTS_OVER_SCORE');
}

const round = calculateRoundSg(
  [
    { holeNo: 1, par: 4, distanceM: 360, score: 4, putts: 2, firstPuttDistanceM: 9 },
    { holeNo: 2, par: 4, distanceM: 360, score: 5, putts: 3, firstPuttDistanceM: 15 },
  ],
  10,
);

check('putt expected anchor lookup', nearlyEqual(getPuttExpected(9, 10), 2.05));
check('putt expected distance interpolation', nearlyEqual(getPuttExpected(1.5, 10), 1.235));
check('putt expected handicap interpolation', nearlyEqual(getPuttExpected(5, 15), 1.85));
check('hole expected anchor lookup', nearlyEqual(getHoleExpected(4, 360, 10), 4.65));
check('hole expected distance interpolation', nearlyEqual(getHoleExpected(4, 375, 10), 4.75));
check('hole expected handicap interpolation', nearlyEqual(getHoleExpected(4, 360, 15), 4.9));
check('good GIR green SG', nearlyEqual(goodGir.greenSg, 0.6));
check('good GIR putting SG', nearlyEqual(goodGir.puttingSg, 0.05));
check('good GIR total SG', nearlyEqual(goodGir.totalSg, 0.65));
check('total identity', nearlyEqual(longBogey.greenSg + longBogey.puttingSg, longBogey.holeExpected - 5));
check('missing distance split omitted', missingDistance.greenSg === null && missingDistance.puttingSg === null);
check('zero putt hole-out', nearlyEqual(zeroPutt.greenSg, 1.5) && zeroPutt.puttingSg === 0);
check('invalid putts validation', invalidPutts);
check('round aggregation', nearlyEqual(round.summary.greenSg, 1.08) && nearlyEqual(round.summary.puttingSg, -0.78));

const failed = checks.filter((item) => !item.passed);
window.__SG_TEST_RESULTS__ = { passed: failed.length === 0, checks };
result.textContent = failed.length
  ? `FAILED\n${failed.map((item) => `- ${item.name}`).join('\n')}`
  : `PASSED\n${checks.map((item) => `- ${item.name}`).join('\n')}`;
