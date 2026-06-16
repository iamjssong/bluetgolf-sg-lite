import { interpolateByAnchor, interpolateRows } from './interpolation.js';

export const HOLE_EXPECTED_TABLES = {
  3: [
    { distanceM: 100, values: { 0: 3.05, 10: 3.25, 20: 3.55, 30: 3.9 } },
    { distanceM: 130, values: { 0: 3.15, 10: 3.4, 20: 3.75, 30: 4.15 } },
    { distanceM: 160, values: { 0: 3.3, 10: 3.6, 20: 4, 30: 4.45 } },
    { distanceM: 190, values: { 0: 3.5, 10: 3.85, 20: 4.3, 30: 4.8 } },
  ],
  4: [
    { distanceM: 300, values: { 0: 4.05, 10: 4.35, 20: 4.75, 30: 5.25 } },
    { distanceM: 330, values: { 0: 4.15, 10: 4.5, 20: 4.95, 30: 5.45 } },
    { distanceM: 360, values: { 0: 4.25, 10: 4.65, 20: 5.15, 30: 5.7 } },
    { distanceM: 390, values: { 0: 4.4, 10: 4.85, 20: 5.4, 30: 6 } },
    { distanceM: 420, values: { 0: 4.6, 10: 5.1, 20: 5.7, 30: 6.35 } },
  ],
  5: [
    { distanceM: 450, values: { 0: 4.75, 10: 5.25, 20: 5.85, 30: 6.45 } },
    { distanceM: 480, values: { 0: 4.9, 10: 5.45, 20: 6.1, 30: 6.75 } },
    { distanceM: 510, values: { 0: 5.05, 10: 5.7, 20: 6.4, 30: 7.1 } },
    { distanceM: 540, values: { 0: 5.25, 10: 5.95, 20: 6.75, 30: 7.5 } },
  ],
};

export function getHoleExpected(par, distanceM, handicapIndex) {
  const rows = HOLE_EXPECTED_TABLES[par];
  if (!rows) {
    throw new Error('par must be 3, 4, or 5');
  }

  return interpolateRows(rows, distanceM, 'distanceM', (row) => interpolateByAnchor(row.values, handicapIndex));
}
