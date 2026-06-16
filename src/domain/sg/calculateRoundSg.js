import { calculateHoleSg } from './calculateHoleSg.js';
import { classifyRoundInsight } from './insightRules.js';

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function findExtreme(holes, key, compare) {
  return holes
    .filter((hole) => hole.sg?.[key] != null)
    .reduce((best, hole) => {
      if (!best || compare(hole.sg[key], best.sg[key])) {
        return hole;
      }

      return best;
    }, null)?.holeNo;
}

export function calculateRoundSg(holes, handicapIndex) {
  const holesWithSg = holes.map((hole) => {
    try {
      return {
        ...hole,
        sg: calculateHoleSg({ ...hole, handicapIndex }),
        validationErrors: [],
      };
    } catch (error) {
      return {
        ...hole,
        sg: null,
        validationErrors: error.codes ?? [error.message],
      };
    }
  });

  const splitHoles = holesWithSg.filter((hole) => hole.sg?.greenSg != null && hole.sg?.puttingSg != null);
  const totalHoles = holesWithSg.filter((hole) => hole.sg?.totalSg != null);
  const greenSg = sum(splitHoles.map((hole) => hole.sg.greenSg));
  const puttingSg = sum(splitHoles.map((hole) => hole.sg.puttingSg));
  const totalSg = sum(totalHoles.map((hole) => hole.sg.totalSg));
  const insight = classifyRoundInsight(greenSg, puttingSg);

  return {
    holes: holesWithSg,
    summary: {
      holesCalculated: splitHoles.length,
      totalHolesCalculated: totalHoles.length,
      greenSg,
      puttingSg,
      totalSg,
      avgGreenSgPerHole: splitHoles.length ? greenSg / splitHoles.length : 0,
      avgPuttingSgPerHole: splitHoles.length ? puttingSg / splitHoles.length : 0,
      bestGreenHoleNo: findExtreme(splitHoles, 'greenSg', (next, current) => next > current),
      worstGreenHoleNo: findExtreme(splitHoles, 'greenSg', (next, current) => next < current),
      bestPuttingHoleNo: findExtreme(splitHoles, 'puttingSg', (next, current) => next > current),
      worstPuttingHoleNo: findExtreme(splitHoles, 'puttingSg', (next, current) => next < current),
      insightCode: insight.code,
      insightText: insight.text,
    },
  };
}
