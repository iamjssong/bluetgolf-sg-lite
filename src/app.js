import { calculateHoleSg } from './domain/sg/calculateHoleSg.js';
import { calculateRoundSg } from './domain/sg/calculateRoundSg.js';
import { FIRST_PUTT_BUCKETS } from './domain/sg/expectedPutts.js';
import { CONFIDENCE_LABELS, SG_LABELS } from './domain/sg/sgTypes.js';
import { GREEN_ARRIVAL_OPTIONS, sampleHoles, sampleTrend } from './domain/sg/sampleRound.js';
import { HOLE_REASON_COPY } from './domain/sg/insightRules.js';
import { roundForDisplay } from './domain/sg/interpolation.js';

const STORAGE_KEY = 'bluetgolf-sg-lite-state-v2';

const defaultState = {
  activeTab: 'input',
  handicapIndex: 10,
  courseName: 'BlueT CC West',
  playedAt: new Date().toISOString().slice(0, 10),
  selectedHoleNo: 4,
  entryMode: 'BUCKET',
  holes: sampleHoles,
};

const app = document.querySelector('#app');
const liveInputTimers = new Map();
let state = loadState();

function loadState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return structuredClone(defaultState);
    }

    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      holes: parsed.holes?.length ? parsed.holes : structuredClone(sampleHoles),
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setState(patch) {
  state = { ...state, ...patch };
  saveState();
  render();
}

function updateHole(holeNo, patch) {
  state = {
    ...state,
    holes: state.holes.map((hole) => (hole.holeNo === holeNo ? { ...hole, ...patch } : hole)),
  };
  saveState();
  render();
}

function selectedHole() {
  return state.holes.find((hole) => hole.holeNo === state.selectedHoleNo) ?? state.holes[0];
}

function selectedHoleSg() {
  try {
    return calculateHoleSg({ ...selectedHole(), handicapIndex: state.handicapIndex });
  } catch (error) {
    return { error };
  }
}

function formatSg(value, digits = 2) {
  if (value == null) {
    return '거리 필요';
  }

  const rounded = roundForDisplay(value, digits);
  if (Math.abs(rounded) < 0.005) {
    return '±0.00';
  }

  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(digits)}`;
}

function valueTone(value) {
  if (value == null) return 'muted';
  if (value > 0.15) return 'positive';
  if (value < -0.15) return 'negative';
  return 'neutral';
}

function icon(name) {
  const paths = {
    input: '<path d="M4 17.5V20h2.5L17.8 8.7l-2.5-2.5L4 17.5Z"/><path d="m14.6 4.4 2.5 2.5 1.2-1.2a1.7 1.7 0 0 0 0-2.4 1.7 1.7 0 0 0-2.4 0l-1.3 1.1Z"/>',
    report: '<path d="M6 3h9l3 3v15H6V3Z"/><path d="M14 3v4h4"/><path d="M9 11h6"/><path d="M9 15h6"/><path d="M9 19h4"/>',
    trend: '<path d="M4 18h16"/><path d="M6 15l4-4 3 3 5-7"/><path d="M16 7h2v2"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a8 8 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L15 6.5h-4L10.6 9a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2.2-1.5Z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    golf: '<path d="M7 21V4"/><path d="M7 5h9l-2 3 2 3H7"/><path d="M5 21h6"/><path d="M16.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>',
  };

  return `
    <svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true">
      ${paths[name] ?? paths.golf}
    </svg>
  `;
}

function numberControl(id, label, value, min, max, suffix = '') {
  return `
    <label class="app-field">
      <span>${label}</span>
      <div class="app-stepper" data-stepper="${id}" data-min="${min}" data-max="${max}">
        <button type="button" class="round-icon-button" data-step="-1" aria-label="${label} 줄이기">${icon('minus')}</button>
        <input id="${id}" type="number" min="${min}" max="${max}" value="${value}" inputmode="decimal" />
        <button type="button" class="round-icon-button" data-step="1" aria-label="${label} 늘리기">${icon('plus')}</button>
        ${suffix ? `<em>${suffix}</em>` : ''}
      </div>
    </label>
  `;
}

function renderAppHeader(summary) {
  return `
    <div class="status-bar" aria-hidden="true">
      <span>9:41</span>
      <span class="status-dots"><i></i><i></i><i></i></span>
    </div>
    <header class="app-header">
      <div class="brand-lockup">
        <span class="app-logo">BT</span>
        <div>
          <strong>BlueTgolf</strong>
          <small>오늘 라운드</small>
        </div>
      </div>
      <button type="button" class="hcp-pill" data-tab="settings" aria-label="핸디캡 설정으로 이동">
        ${state.handicapIndex}H
        ${icon('chevron')}
      </button>
    </header>
    <section class="round-hero">
      <div>
        <span class="overline">현재 라운드</span>
        <h1>${state.courseName}</h1>
        <p>${state.playedAt} · ${summary.holesCalculated}/18홀 SG 분리 계산</p>
      </div>
      <div class="round-score ${valueTone(summary.totalSg)}">
        <span>전체 SG</span>
        <strong>${formatSg(summary.totalSg, 1)}</strong>
      </div>
    </section>
  `;
}

function renderSummaryRail(summary) {
  const items = [
    { label: SG_LABELS.total, value: summary.totalSg, helper: '라운드' },
    { label: SG_LABELS.green, value: summary.greenSg, helper: '그린 전' },
    { label: SG_LABELS.putting, value: summary.puttingSg, helper: '그린 위' },
  ];

  return `
    <section class="summary-rail" aria-label="라운드 SG 요약">
      ${items
        .map(
          (item) => `
            <article class="summary-chip ${valueTone(item.value)}">
              <span>${item.label}</span>
              <strong>${formatSg(item.value, 1)}</strong>
              <small>${item.helper}</small>
            </article>
          `,
        )
        .join('')}
    </section>
  `;
}

function renderHolePicker(round) {
  return `
    <nav class="hole-rail" aria-label="홀 선택">
      ${round.holes
        .map((hole) => {
          const isSelected = hole.holeNo === state.selectedHoleNo;
          return `
            <button type="button" class="hole-pill ${isSelected ? 'selected' : ''} ${valueTone(hole.sg?.totalSg)}" data-hole="${hole.holeNo}">
              <span>${hole.holeNo}</span>
              <small>${formatSg(hole.sg?.totalSg, 1)}</small>
            </button>
          `;
        })
        .join('')}
    </nav>
  `;
}

function renderBucketSelector(hole) {
  return `
    <div class="bucket-row" role="radiogroup" aria-label="첫 퍼트 거리 버킷">
      ${Object.entries(FIRST_PUTT_BUCKETS)
        .map(([key, bucket]) => {
          const selected = hole.firstPuttDistanceBucket === key;
          return `
            <button type="button" class="distance-tile ${selected ? 'selected' : ''}" data-bucket="${key}">
              <strong>${bucket.shortLabel}</strong>
              <span>${bucket.distanceM}m</span>
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderArrivalChips(hole) {
  return `
    <div class="arrival-row" aria-label="그린 도달 상태">
      ${GREEN_ARRIVAL_OPTIONS.map(
        (option) => `
          <button type="button" class="arrival-token ${hole.greenArrivalStatus === option.value ? 'selected' : ''}" data-arrival="${option.value}">
            ${option.label}
          </button>
        `,
      ).join('')}
    </div>
  `;
}

function renderInputScreen(round) {
  const hole = selectedHole();
  const sg = selectedHoleSg();
  const reason = sg.reasonCode ? HOLE_REASON_COPY[sg.reasonCode] : null;
  const errors = sg.error?.codes ?? [];

  return `
    <section class="screen active-screen">
      ${renderSummaryRail(round.summary)}

      <article class="app-card hole-card">
        <div class="card-head">
          <div>
            <span class="overline">홀 입력</span>
            <h2>${hole.holeNo}번 홀</h2>
          </div>
          <div class="hole-tags">
            <span>Par ${hole.par}</span>
            <span>${hole.distanceM}m</span>
          </div>
        </div>

        ${renderHolePicker(round)}

        <div class="control-grid">
          ${numberControl('score', '스코어', hole.score, 1, 12)}
          ${numberControl('putts', '퍼트 수', hole.putts, 0, 8)}
          ${numberControl('penalties', '페널티', hole.penalties ?? 0, 0, 4)}
        </div>

        <div class="distance-block">
          <div class="block-title">
            <div>
              <span class="overline">첫 퍼트 거리</span>
              <p>정확하지 않으면 가까운 거리만 선택해도 분석됩니다.</p>
            </div>
            <div class="app-segmented" role="tablist" aria-label="거리 입력 모드">
              <button type="button" class="${state.entryMode === 'BUCKET' ? 'selected' : ''}" data-mode="BUCKET">버킷</button>
              <button type="button" class="${state.entryMode === 'EXACT' ? 'selected' : ''}" data-mode="EXACT">정확 입력</button>
            </div>
          </div>
          ${
            state.entryMode === 'BUCKET'
              ? renderBucketSelector(hole)
              : numberControl(
                  'firstPuttDistanceM',
                  '첫 퍼트 거리',
                  hole.firstPuttDistanceM ?? FIRST_PUTT_BUCKETS[hole.firstPuttDistanceBucket]?.distanceM ?? 5,
                  1,
                  30,
                  'm',
                )
          }
        </div>

        <div class="arrival-block">
          <span class="overline">그린 도달 상태</span>
          ${renderArrivalChips(hole)}
        </div>

        ${errors.length ? '<div class="validation">퍼트 수는 총 스코어보다 클 수 없습니다.</div>' : ''}
      </article>

      <article class="preview-sheet ${valueTone(sg.totalSg)}">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-head">
          <div>
            <span class="overline">SG 프리뷰</span>
            <h2>${reason?.label ?? '첫 퍼트 거리 필요'}</h2>
          </div>
          <span class="confidence ${sg.confidence?.toLowerCase() ?? 'low'}">신뢰도 ${CONFIDENCE_LABELS[sg.confidence] ?? '낮음'}</span>
        </div>
        <div class="preview-grid">
          <div>
            <span>${SG_LABELS.green}</span>
            <strong class="${valueTone(sg.greenSg)}">${formatSg(sg.greenSg)}</strong>
          </div>
          <div>
            <span>${SG_LABELS.putting}</span>
            <strong class="${valueTone(sg.puttingSg)}">${formatSg(sg.puttingSg)}</strong>
          </div>
          <div>
            <span>${SG_LABELS.total}</span>
            <strong class="${valueTone(sg.totalSg)}">${formatSg(sg.totalSg)}</strong>
          </div>
        </div>
        <p>${reason?.sentence ?? '첫 퍼트 거리를 입력하면 그린까지와 퍼팅을 분리해서 분석할 수 있습니다.'}</p>
        <div class="formula-strip">
          <span>Hole ${sg.holeExpected == null ? '-' : roundForDisplay(sg.holeExpected, 2)}</span>
          <span>Putt ${sg.puttExpected == null ? '-' : roundForDisplay(sg.puttExpected, 2)}</span>
          <span>Before ${sg.strokesBeforePutting ?? '-'}</span>
        </div>
      </article>
    </section>
  `;
}

function renderReportScreen(round) {
  const summary = round.summary;

  return `
    <section class="screen active-screen">
      <article class="app-card insight-card">
        <span class="overline">라운드 리포트</span>
        <h2>${summary.insightText}</h2>
        <div class="insight-matrix">
          <div><span>베스트 그린</span><strong>${summary.bestGreenHoleNo ?? '-'}번</strong></div>
          <div><span>워스트 그린</span><strong>${summary.worstGreenHoleNo ?? '-'}번</strong></div>
          <div><span>베스트 퍼팅</span><strong>${summary.bestPuttingHoleNo ?? '-'}번</strong></div>
          <div><span>워스트 퍼팅</span><strong>${summary.worstPuttingHoleNo ?? '-'}번</strong></div>
        </div>
      </article>

      <div class="hole-list">
        ${round.holes
          .map((hole) => {
            const reason = hole.sg?.reasonCode ? HOLE_REASON_COPY[hole.sg.reasonCode] : null;
            const firstPutt = hole.firstPuttDistanceM
              ? `${hole.firstPuttDistanceM}m`
              : `${FIRST_PUTT_BUCKETS[hole.firstPuttDistanceBucket]?.distanceM ?? '-'}m`;

            return `
              <button type="button" class="hole-row ${hole.holeNo === state.selectedHoleNo ? 'selected' : ''}" data-row-hole="${hole.holeNo}">
                <span class="row-hole">${hole.holeNo}</span>
                <span class="row-main">
                  <strong>Par ${hole.par} · ${hole.score}타 · ${hole.putts}퍼트</strong>
                  <small>${firstPutt} · ${reason?.label ?? '거리 필요'}${(hole.penalties ?? 0) > 0 ? ' · 페널티' : ''}</small>
                </span>
                <span class="row-sg ${valueTone(hole.sg?.totalSg)}">${formatSg(hole.sg?.totalSg, 1)}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function renderTrendScreen(summary) {
  const trend = sampleTrend.map((item) => (item.label === '오늘' ? { ...item, ...summary } : item));
  const maxAbs = Math.max(...trend.flatMap((item) => [Math.abs(item.greenSg), Math.abs(item.puttingSg), Math.abs(item.totalSg)]), 1);

  return `
    <section class="screen active-screen">
      <article class="app-card trend-card">
        <span class="overline">추이</span>
        <h2>최근 3라운드</h2>
        <div class="trend-list">
          ${trend
            .map(
              (item) => `
                <div class="trend-item">
                  <span>${item.label}</span>
                  <div class="trend-track">
                    <i class="green" style="width:${Math.max((Math.abs(item.greenSg) / maxAbs) * 100, 8)}%"></i>
                    <i class="putting" style="width:${Math.max((Math.abs(item.puttingSg) / maxAbs) * 100, 8)}%"></i>
                  </div>
                  <strong class="${valueTone(item.totalSg)}">${formatSg(item.totalSg, 1)}</strong>
                </div>
              `,
            )
            .join('')}
        </div>
        <div class="trend-legend">
          <span><i class="green"></i>그린까지 SG</span>
          <span><i class="putting"></i>퍼팅 SG</span>
        </div>
      </article>
    </section>
  `;
}

function renderSettingsScreen() {
  return `
    <section class="screen active-screen">
      <article class="app-card settings-card">
        <span class="overline">설정</span>
        <h2>라운드 기준</h2>
        <label class="settings-field">
          <span>코스</span>
          <input id="courseName" type="text" value="${state.courseName}" />
        </label>
        <label class="settings-field">
          <span>플레이일</span>
          <input id="playedAt" type="date" value="${state.playedAt}" />
        </label>
        <label class="settings-field">
          <span>핸디캡 ${state.handicapIndex}H</span>
          <input id="handicapIndex" type="range" min="0" max="36" step="1" value="${state.handicapIndex}" />
        </label>
        <button type="button" class="primary-action" id="resetRound">샘플 라운드로 초기화</button>
      </article>
    </section>
  `;
}

function renderActiveScreen(round) {
  if (state.activeTab === 'report') return renderReportScreen(round);
  if (state.activeTab === 'trend') return renderTrendScreen(round.summary);
  if (state.activeTab === 'settings') return renderSettingsScreen();
  return renderInputScreen(round);
}

function renderBottomNav() {
  const tabs = [
    { key: 'input', label: '입력', icon: 'input' },
    { key: 'report', label: '리포트', icon: 'report' },
    { key: 'trend', label: '추이', icon: 'trend' },
    { key: 'settings', label: '설정', icon: 'settings' },
  ];

  return `
    <nav class="bottom-nav" aria-label="앱 탭">
      ${tabs
        .map(
          (tab) => `
            <button type="button" class="${state.activeTab === tab.key ? 'selected' : ''}" data-tab="${tab.key}">
              ${icon(tab.icon)}
              <span>${tab.label}</span>
            </button>
          `,
        )
        .join('')}
    </nav>
  `;
}

function render() {
  const round = calculateRoundSg(state.holes, state.handicapIndex);

  app.innerHTML = `
    <main class="app-frame">
      ${renderAppHeader(round.summary)}
      <div class="screen-stack">
        ${renderActiveScreen(round)}
      </div>
      ${renderBottomNav()}
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => setState({ activeTab: button.dataset.tab }));
  });

  document.querySelector('#handicapIndex')?.addEventListener('input', (event) => {
    setState({ handicapIndex: Number(event.target.value) });
  });

  document.querySelector('#courseName')?.addEventListener('change', (event) => {
    setState({ courseName: event.target.value });
  });

  document.querySelector('#playedAt')?.addEventListener('change', (event) => {
    setState({ playedAt: event.target.value });
  });

  document.querySelectorAll('[data-hole], [data-row-hole]').forEach((button) => {
    button.addEventListener('click', () => {
      const holeNo = Number(button.dataset.hole ?? button.dataset.rowHole);
      setState({ selectedHoleNo: holeNo, activeTab: button.dataset.rowHole ? 'input' : state.activeTab });
    });
  });

  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => setState({ entryMode: button.dataset.mode }));
  });

  document.querySelectorAll('[data-bucket]').forEach((button) => {
    button.addEventListener('click', () => {
      updateHole(state.selectedHoleNo, {
        firstPuttDistanceBucket: button.dataset.bucket,
        firstPuttDistanceM: null,
      });
    });
  });

  document.querySelectorAll('[data-arrival]').forEach((button) => {
    button.addEventListener('click', () => updateHole(state.selectedHoleNo, { greenArrivalStatus: button.dataset.arrival }));
  });

  document.querySelectorAll('.app-stepper').forEach((stepper) => {
    const input = stepper.querySelector('input');
    const field = input.id;
    const min = Number(stepper.dataset.min);
    const max = Number(stepper.dataset.max);
    const commitValue = () => {
      if (input.value.trim() === '') return;

      const nextValue = Math.min(Math.max(Number(input.value), min), max);
      if (Number.isFinite(nextValue)) {
        updateHole(state.selectedHoleNo, { [field]: nextValue });
      }
    };

    stepper.querySelectorAll('[data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const step = Number(button.dataset.step);
        const nextValue = Math.min(Math.max(Number(input.value) + step, min), max);
        updateHole(state.selectedHoleNo, { [field]: nextValue });
      });
    });

    input.addEventListener('input', () => {
      window.clearTimeout(liveInputTimers.get(field));
      liveInputTimers.set(field, window.setTimeout(commitValue, 160));
    });

    input.addEventListener('change', commitValue);
  });

  document.querySelector('#resetRound')?.addEventListener('click', () => {
    state = structuredClone(defaultState);
    saveState();
    render();
  });
}

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

render();
