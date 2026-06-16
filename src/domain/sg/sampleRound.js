export const GREEN_ARRIVAL_OPTIONS = [
  { value: 'GIR', label: 'GIR' },
  { value: 'N_GIR_PLUS_1', label: '3온' },
  { value: 'MISSED_GREEN', label: '미스' },
  { value: 'BUNKER', label: '벙커' },
  { value: 'FRINGE', label: '프린지' },
  { value: 'PENALTY', label: '페널티' },
];

export const sampleHoles = [
  { holeNo: 1, par: 4, distanceM: 360, score: 5, putts: 2, firstPuttDistanceBucket: 'LONG', penalties: 0, greenArrivalStatus: 'N_GIR_PLUS_1' },
  { holeNo: 2, par: 5, distanceM: 500, score: 5, putts: 2, firstPuttDistanceBucket: 'LONG', penalties: 0, greenArrivalStatus: 'GIR' },
  { holeNo: 3, par: 3, distanceM: 145, score: 4, putts: 2, firstPuttDistanceBucket: 'MEDIUM', penalties: 0, greenArrivalStatus: 'MISSED_GREEN' },
  { holeNo: 4, par: 4, distanceM: 360, score: 4, putts: 2, firstPuttDistanceM: 9, firstPuttDistanceBucket: 'LONG', penalties: 0, greenArrivalStatus: 'GIR' },
  { holeNo: 5, par: 4, distanceM: 360, score: 6, putts: 2, firstPuttDistanceBucket: 'MEDIUM', penalties: 1, greenArrivalStatus: 'PENALTY' },
  { holeNo: 6, par: 3, distanceM: 170, score: 3, putts: 1, firstPuttDistanceBucket: 'SHORT', penalties: 0, greenArrivalStatus: 'MISSED_GREEN' },
  { holeNo: 7, par: 4, distanceM: 390, score: 5, putts: 3, firstPuttDistanceBucket: 'VERY_LONG', penalties: 0, greenArrivalStatus: 'GIR' },
  { holeNo: 8, par: 5, distanceM: 520, score: 6, putts: 2, firstPuttDistanceBucket: 'SHORT', penalties: 0, greenArrivalStatus: 'N_GIR_PLUS_1' },
  { holeNo: 9, par: 4, distanceM: 330, score: 4, putts: 1, firstPuttDistanceBucket: 'TAP_IN', penalties: 0, greenArrivalStatus: 'MISSED_GREEN' },
  { holeNo: 10, par: 4, distanceM: 370, score: 5, putts: 2, firstPuttDistanceBucket: 'MEDIUM', penalties: 0, greenArrivalStatus: 'N_GIR_PLUS_1' },
  { holeNo: 11, par: 3, distanceM: 130, score: 3, putts: 2, firstPuttDistanceBucket: 'MEDIUM', penalties: 0, greenArrivalStatus: 'GIR' },
  { holeNo: 12, par: 5, distanceM: 540, score: 7, putts: 3, firstPuttDistanceBucket: 'VERY_LONG', penalties: 0, greenArrivalStatus: 'GIR' },
  { holeNo: 13, par: 4, distanceM: 420, score: 6, putts: 2, firstPuttDistanceBucket: 'SHORT', penalties: 1, greenArrivalStatus: 'PENALTY' },
  { holeNo: 14, par: 4, distanceM: 300, score: 4, putts: 1, firstPuttDistanceBucket: 'SHORT', penalties: 0, greenArrivalStatus: 'MISSED_GREEN' },
  { holeNo: 15, par: 3, distanceM: 190, score: 5, putts: 2, firstPuttDistanceBucket: 'LONG', penalties: 0, greenArrivalStatus: 'BUNKER' },
  { holeNo: 16, par: 4, distanceM: 390, score: 4, putts: 2, firstPuttDistanceBucket: 'LONG', penalties: 0, greenArrivalStatus: 'GIR' },
  { holeNo: 17, par: 5, distanceM: 480, score: 5, putts: 2, firstPuttDistanceBucket: 'MEDIUM', penalties: 0, greenArrivalStatus: 'GIR' },
  { holeNo: 18, par: 4, distanceM: 360, score: 5, putts: 2, firstPuttDistanceBucket: 'LONG', penalties: 0, greenArrivalStatus: 'N_GIR_PLUS_1' },
];

export const sampleTrend = [
  { label: '2R 전', totalSg: -3.4, greenSg: -0.8, puttingSg: -2.6 },
  { label: '1R 전', totalSg: -1.1, greenSg: 1.2, puttingSg: -2.3 },
  { label: '오늘', totalSg: 0, greenSg: 0, puttingSg: 0 },
];
