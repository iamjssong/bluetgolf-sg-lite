export const HCP_ANCHORS = [0, 10, 20, 30];

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

export function interpolateByAnchor(valuesByAnchor, handicapIndex) {
  assertFiniteNumber(handicapIndex, 'handicapIndex');

  const hcp = clamp(handicapIndex, HCP_ANCHORS[0], HCP_ANCHORS[HCP_ANCHORS.length - 1]);
  const exactValue = valuesByAnchor[hcp];
  if (exactValue != null) {
    return exactValue;
  }

  const upperIndex = HCP_ANCHORS.findIndex((anchor) => anchor > hcp);
  const upper = HCP_ANCHORS[upperIndex];
  const lower = HCP_ANCHORS[upperIndex - 1];
  const ratio = (hcp - lower) / (upper - lower);

  return valuesByAnchor[lower] + ratio * (valuesByAnchor[upper] - valuesByAnchor[lower]);
}

export function interpolateRows(rows, xValue, xKey, valueResolver) {
  assertFiniteNumber(xValue, xKey);

  const sortedRows = [...rows].sort((a, b) => a[xKey] - b[xKey]);
  const clampedX = clamp(xValue, sortedRows[0][xKey], sortedRows[sortedRows.length - 1][xKey]);
  const exactRow = sortedRows.find((row) => row[xKey] === clampedX);

  if (exactRow) {
    return valueResolver(exactRow);
  }

  const upperIndex = sortedRows.findIndex((row) => row[xKey] > clampedX);
  const lowerRow = sortedRows[upperIndex - 1];
  const upperRow = sortedRows[upperIndex];
  const ratio = (clampedX - lowerRow[xKey]) / (upperRow[xKey] - lowerRow[xKey]);

  return valueResolver(lowerRow) + ratio * (valueResolver(upperRow) - valueResolver(lowerRow));
}

export function roundForDisplay(value, digits = 2) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
