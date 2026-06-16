const GOOD = 0.3;
const BAD = -0.3;

export const HOLE_REASON_COPY = {
  GOOD_SHOTS: {
    label: '좋은 그린 도달',
    sentence: '그린까지의 과정이 좋았고 퍼팅도 흐름을 지켰습니다.',
  },
  PUTTING_LOSS: {
    label: '퍼팅 손실',
    sentence: '그린까지는 좋았지만 퍼팅에서 타수를 잃었습니다.',
  },
  RECOVERY_PUTTING: {
    label: '퍼팅으로 만회',
    sentence: '그린까지 손실이 있었지만 퍼팅으로 만회했습니다.',
  },
  FULL_LOSS: {
    label: '전체 손실',
    sentence: '그린까지와 퍼팅 모두에서 개선 여지가 있습니다.',
  },
  NEUTRAL: {
    label: '기준 근처',
    sentence: '핸디캡 기준과 비슷한 수준의 홀입니다.',
  },
  HOLED_OUT_OFF_GREEN: {
    label: '그린 밖 홀아웃',
    sentence: '그린 밖에서 홀아웃해 퍼팅 손익을 0으로 처리했습니다.',
  },
  MIXED: {
    label: '혼합 요인',
    sentence: '그린까지와 퍼팅 중 한쪽이 약간 더 영향을 줬습니다.',
  },
};

export function classifyHoleReason(greenSg, puttingSg) {
  if (greenSg >= GOOD && puttingSg >= -0.1) {
    return 'GOOD_SHOTS';
  }

  if (greenSg >= GOOD && puttingSg < BAD) {
    return 'PUTTING_LOSS';
  }

  if (greenSg < BAD && puttingSg >= GOOD) {
    return 'RECOVERY_PUTTING';
  }

  if (greenSg < BAD && puttingSg < BAD) {
    return 'FULL_LOSS';
  }

  if (Math.abs(greenSg) < GOOD && Math.abs(puttingSg) < GOOD) {
    return 'NEUTRAL';
  }

  return 'MIXED';
}

export function classifyRoundInsight(roundGreenSg, roundPuttingSg) {
  if (roundGreenSg > 1 && roundPuttingSg < -1) {
    return {
      code: 'GOOD_GREEN_PUTTING_LOSS',
      text: '그린까지는 좋았지만 퍼팅에서 스코어를 잃었습니다.',
    };
  }

  if (roundGreenSg < -1 && roundPuttingSg > 1) {
    return {
      code: 'PUTTING_SAVED_ROUND',
      text: '퍼팅은 좋았지만 그린까지 가는 과정에서 타수를 잃었습니다.',
    };
  }

  if (roundGreenSg < -1 && roundPuttingSg < -1) {
    return {
      code: 'FULL_GAME_LOSS',
      text: '오늘은 그린까지와 퍼팅 모두 개선 여지가 있습니다.',
    };
  }

  if (roundGreenSg > 1 && roundPuttingSg > 1) {
    return {
      code: 'STRONG_ROUND',
      text: '핸디캡 기준 대비 매우 좋은 라운드입니다.',
    };
  }

  return {
    code: 'BASELINE_ROUND',
    text: '핸디캡 기준과 비슷한 라운드입니다.',
  };
}
