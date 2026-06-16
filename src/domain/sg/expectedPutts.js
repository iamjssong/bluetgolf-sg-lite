import { clamp, interpolateByAnchor, interpolateRows } from './interpolation.js';

export const FIRST_PUTT_BUCKETS = {
  TAP_IN: { label: '붙일 거리', shortLabel: '붙일', distanceM: 1 },
  SHORT: { label: '짧음', shortLabel: '짧음', distanceM: 2 },
  MEDIUM: { label: '보통', shortLabel: '보통', distanceM: 5 },
  LONG: { label: '멀다', shortLabel: '멀다', distanceM: 9 },
  VERY_LONG: { label: '매우 멀다', shortLabel: '매우 멀다', distanceM: 15 },
};

export const PUTT_EXPECTED_TABLE = [
  { distanceM: 1, values: { 0: 1.08, 10: 1.12, 20: 1.18, 30: 1.26 } },
  { distanceM: 2, values: { 0: 1.28, 10: 1.35, 20: 1.44, 30: 1.58 } },
  { distanceM: 3, values: { 0: 1.45, 10: 1.55, 20: 1.65, 30: 1.82 } },
  { distanceM: 4, values: { 0: 1.58, 10: 1.69, 20: 1.8, 30: 1.99 } },
  { distanceM: 5, values: { 0: 1.68, 10: 1.79, 20: 1.91, 30: 2.11 } },
  { distanceM: 6, values: { 0: 1.76, 10: 1.87, 20: 2, 30: 2.2 } },
  { distanceM: 7, values: { 0: 1.83, 10: 1.94, 20: 2.08, 30: 2.27 } },
  { distanceM: 8, values: { 0: 1.89, 10: 2, 20: 2.14, 30: 2.32 } },
  { distanceM: 9, values: { 0: 1.94, 10: 2.05, 20: 2.19, 30: 2.36 } },
  { distanceM: 10, values: { 0: 1.98, 10: 2.09, 20: 2.23, 30: 2.39 } },
  { distanceM: 11, values: { 0: 2.02, 10: 2.11, 20: 2.26, 30: 2.41 } },
  { distanceM: 12, values: { 0: 2.04, 10: 2.13, 20: 2.28, 30: 2.42 } },
  { distanceM: 13, values: { 0: 2.07, 10: 2.15, 20: 2.29, 30: 2.43 } },
  { distanceM: 14, values: { 0: 2.09, 10: 2.16, 20: 2.3, 30: 2.44 } },
  { distanceM: 15, values: { 0: 2.1, 10: 2.17, 20: 2.31, 30: 2.44 } },
];

export function bucketToDistance(bucket) {
  return FIRST_PUTT_BUCKETS[bucket]?.distanceM ?? null;
}

export function getPuttExpected(firstPuttDistanceM, handicapIndex) {
  const normalizedDistance = clamp(firstPuttDistanceM, 1, 15);

  return interpolateRows(PUTT_EXPECTED_TABLE, normalizedDistance, 'distanceM', (row) =>
    interpolateByAnchor(row.values, handicapIndex),
  );
}
