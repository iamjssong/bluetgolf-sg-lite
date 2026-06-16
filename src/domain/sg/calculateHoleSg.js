import { getHoleExpected } from './expectedHoles.js';
import { bucketToDistance, getPuttExpected } from './expectedPutts.js';
import { classifyHoleReason } from './insightRules.js';

export function validateHoleInput(input) {
  const errors = [];

  if (![3, 4, 5].includes(input.par)) {
    errors.push('PAR_INVALID');
  }

  if (!Number.isFinite(input.distanceM) || input.distanceM <= 0) {
    errors.push('DISTANCE_INVALID');
  }

  if (!Number.isFinite(input.score) || input.score < 1) {
    errors.push('SCORE_INVALID');
  }

  if (!Number.isFinite(input.putts) || input.putts < 0) {
    errors.push('PUTTS_INVALID');
  }

  if (Number.isFinite(input.score) && Number.isFinite(input.putts) && input.putts > input.score) {
    errors.push('PUTTS_OVER_SCORE');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(','));
    error.codes = errors;
    throw error;
  }
}

export function resolveFirstPuttDistance(input) {
  if (Number.isFinite(input.firstPuttDistanceM)) {
    return { distanceM: input.firstPuttDistanceM, confidence: 'HIGH', source: 'EXACT' };
  }

  const bucketDistance = bucketToDistance(input.firstPuttDistanceBucket);
  if (bucketDistance != null) {
    return { distanceM: bucketDistance, confidence: 'MEDIUM', source: 'BUCKET' };
  }

  return { distanceM: null, confidence: 'LOW', source: 'MISSING' };
}

export function calculateHoleSg(input) {
  validateHoleInput(input);

  const holeExpected = getHoleExpected(input.par, input.distanceM, input.handicapIndex);
  const strokesBeforePutting = input.score - input.putts;
  const totalOnlySg = holeExpected - input.score;

  if (input.putts === 0) {
    return {
      holeExpected,
      puttExpected: null,
      strokesBeforePutting,
      greenSg: totalOnlySg,
      puttingSg: 0,
      totalSg: totalOnlySg,
      reasonCode: 'HOLED_OUT_OFF_GREEN',
      confidence: 'HIGH',
      warnings: ['HOLED_OUT_OFF_GREEN'],
    };
  }

  const firstPutt = resolveFirstPuttDistance(input);

  if (firstPutt.distanceM == null) {
    return {
      holeExpected,
      puttExpected: null,
      strokesBeforePutting,
      greenSg: null,
      puttingSg: null,
      totalSg: totalOnlySg,
      reasonCode: null,
      confidence: 'LOW',
      warnings: ['FIRST_PUTT_DISTANCE_MISSING'],
    };
  }

  const puttExpected = getPuttExpected(firstPutt.distanceM, input.handicapIndex);
  const greenSg = holeExpected - strokesBeforePutting - puttExpected;
  const puttingSg = puttExpected - input.putts;
  const totalSg = greenSg + puttingSg;

  return {
    holeExpected,
    puttExpected,
    strokesBeforePutting,
    greenSg,
    puttingSg,
    totalSg,
    reasonCode: classifyHoleReason(greenSg, puttingSg),
    confidence: firstPutt.confidence,
    warnings: [],
  };
}
