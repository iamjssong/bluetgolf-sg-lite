import { calculateHoleSg } from './domain/sg/calculateHoleSg.js';
import { calculateRoundSg } from './domain/sg/calculateRoundSg.js';
import { FIRST_PUTT_BUCKETS } from './domain/sg/expectedPutts.js';
import { CONFIDENCE_LABELS, SG_LABELS } from './domain/sg/sgTypes.js';
import { GREEN_ARRIVAL_OPTIONS } from './domain/sg/sampleRound.js';
import { HOLE_REASON_COPY } from './domain/sg/insightRules.js';
import { roundForDisplay } from './domain/sg/interpolation.js';

const STORAGE_KEY = 'bluetgolf-sg-lite-state-v3';
const COURSE_XML_URL = './data/courses.xml';

const defaultState = {
  activeTab: 'dashboard',
  handicapIndex: 10,
  courseId: '',
  courseName: '',
  playedAt: new Date().toISOString().slice(0, 10),
  selectedHoleNo: 1,
  entryMode: 'BUCKET',
  holes: [],
  savedRounds: [],
  completionMode: false,
};

const app = document.querySelector('#app');
const liveInputTimers = new Map();
let courses = [];
let coursesLoaded = false;
let courseLoadError = '';
let state = loadState();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function loadState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return clone(defaultState);
    }

    const parsed = JSON.parse(stored);
    return {
      ...clone(defaultState),
      ...parsed,
      holes: Array.isArray(parsed.holes) ? parsed.holes : [],
      savedRounds: Array.isArray(parsed.savedRounds) ? parsed.savedRounds : [],
    };
  } catch {
    return clone(defaultState);
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
  if (!state.holes.length) {
    return;
  }

  state = {
    ...state,
    holes: state.holes.map((hole) => (hole.holeNo === holeNo ? { ...hole, ...patch } : hole)),
  };
  saveState();
  render();
}

async function loadCourses() {
  try {
    const response = await fetch(COURSE_XML_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Course XML request failed: ${response.status}`);
    }

    courses = parseCoursesXml(await response.text());
    coursesLoaded = true;
    courseLoadError = '';
    hydrateStoredCourseIfNeeded();
  } catch (error) {
    coursesLoaded = true;
    courseLoadError = error.message;
  }

  render();
}

function parseCoursesXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Course XML parse failed');
  }

  return [...doc.querySelectorAll('course')]
    .map((courseNode) => ({
      id: courseNode.getAttribute('id') ?? '',
      name: courseNode.getAttribute('name') ?? '',
      country: courseNode.getAttribute('country') ?? '',
      holes: [...courseNode.querySelectorAll('hole')].map((holeNode) => ({
        holeNo: Number(holeNode.getAttribute('no')),
        par: Number(holeNode.getAttribute('par')),
        distanceM: Number(holeNode.getAttribute('distanceM')),
      })),
    }))
    .filter((course) => course.id && course.name && course.holes.length === 18);
}

function hydrateStoredCourseIfNeeded() {
  if (!state.courseId || state.holes.length) {
    return;
  }

  const course = courses.find((item) => item.id === state.courseId);
  if (!course) {
    return;
  }

  state = {
    ...state,
    courseName: course.name,
    selectedHoleNo: 1,
    holes: createBlankHoles(course),
  };
  saveState();
}

function createBlankHoles(course) {
  return course.holes.map((hole) => ({
    ...hole,
    score: null,
    putts: null,
    firstPuttDistanceM: null,
    firstPuttDistanceBucket: null,
    penalties: 0,
    greenArrivalStatus: null,
  }));
}

function selectCourse(courseId) {
  if (!courseId) {
    setState({
      courseId: '',
      courseName: '',
      selectedHoleNo: 1,
      holes: [],
      activeTab: 'input',
    });
    return;
  }

  const course = courses.find((item) => item.id === courseId);
  if (!course) {
    return;
  }

  if (state.courseId === courseId && state.holes.length) {
    setState({ activeTab: 'input' });
    return;
  }

  setState({
    courseId: course.id,
    courseName: course.name,
    selectedHoleNo: 1,
    activeTab: 'input',
    holes: createBlankHoles(course),
  });
}

function hasCourse() {
  return Boolean(state.courseId && state.holes.length);
}

function getRoundFromRecord(record) {
  return calculateRoundSg(record.holes ?? [], record.handicapIndex ?? state.handicapIndex);
}

function getSavedRoundModels(limit = Infinity) {
  return state.savedRounds
    .map((record) => ({
      ...record,
      round: getRoundFromRecord(record),
    }))
    .sort((a, b) => String(b.savedAt ?? b.playedAt).localeCompare(String(a.savedAt ?? a.playedAt)))
    .slice(0, limit);
}

function getRecentRounds(limit = 5) {
  return getSavedRoundModels(limit);
}

function getCumulativeSummary(rounds = getSavedRoundModels()) {
  return rounds.reduce(
    (total, record) => {
      const summary = record.round.summary;
      total.rounds += 1;
      total.holes += summary.totalHolesCalculated;
      total.totalSg += summary.totalSg;
      total.greenSg += summary.greenSg;
      total.puttingSg += summary.puttingSg;
      return total;
    },
    { rounds: 0, holes: 0, totalSg: 0, greenSg: 0, puttingSg: 0 },
  );
}

function selectedHole() {
  return state.holes.find((hole) => hole.holeNo === state.selectedHoleNo) ?? state.holes[0] ?? null;
}

function selectedHoleSg() {
  const hole = selectedHole();
  if (!hole) {
    return { error: { codes: ['NO_HOLE_SELECTED'] } };
  }

  try {
    return calculateHoleSg({ ...hole, handicapIndex: state.handicapIndex });
  } catch (error) {
    return { error };
  }
}

function formatSg(value, digits = 2, fallback = '거리 필요') {
  if (value == null) {
    return fallback;
  }

  const rounded = roundForDisplay(value, digits);
  if (Math.abs(rounded) < 0.005) {
    return (0).toFixed(digits);
  }

  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(digits)}`;
}

function valueTone(value) {
  if (value == null) return 'muted';
  if (value > 0.15) return 'positive';
  if (value < -0.15) return 'negative';
  return 'neutral';
}

function formatScoreValue(value) {
  return value == null ? '-' : value;
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
  const displayValue = value == null ? '' : value;
  return `
    <label class="app-field">
      <span>${label}</span>
      <div class="app-stepper" data-stepper="${id}" data-min="${min}" data-max="${max}">
        <button type="button" class="round-icon-button" data-step="-1" aria-label="${label} 낮추기">${icon('minus')}</button>
        <input id="${id}" type="number" min="${min}" max="${max}" value="${displayValue}" placeholder="-" inputmode="decimal" />
        <button type="button" class="round-icon-button" data-step="1" aria-label="${label} 올리기">${icon('plus')}</button>
        ${suffix ? `<em>${suffix}</em>` : ''}
      </div>
    </label>
  `;
}

function renderAppHeader(summary) {
  const savedRounds = getSavedRoundModels();
  const cumulative = getCumulativeSummary(savedRounds);
  const title = state.activeTab === 'dashboard' ? 'SG 대시보드' : state.courseName || '골프장을 선택하세요';
  const helper =
    state.activeTab === 'dashboard'
      ? `${cumulative.rounds}라운드 · ${cumulative.holes}홀 누적`
      : state.courseName
        ? `${state.playedAt} · ${summary.holesCalculated}/18홀 SG 분리 계산`
        : '입력 화면에서 코스를 고르면 빈 스코어카드가 열립니다';
  const totalSg = state.activeTab === 'dashboard' ? formatSg(cumulative.totalSg, 1, '-') : state.courseName ? formatSg(summary.totalSg, 1, '-') : '-';
  const scoreLabel = state.activeTab === 'dashboard' ? '누적 SG' : '전체 SG';

  return `
    <header class="app-header">
      <div class="brand-lockup">
        <span class="app-logo">BT</span>
        <div>
          <strong>BlueTgolf</strong>
          <small>SG Lite</small>
        </div>
      </div>
      <button type="button" class="hcp-pill" data-tab="settings" aria-label="핸디캡 설정으로 이동">
        ${state.handicapIndex}H
        ${icon('chevron')}
      </button>
    </header>
    <section class="round-hero">
      <div>
        <span class="overline">${state.activeTab === 'dashboard' ? '전체 기록' : '현재 라운드'}</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${helper}</p>
      </div>
      <div class="round-score ${valueTone(state.activeTab === 'dashboard' ? cumulative.totalSg : summary.totalSg)}">
        <span>${scoreLabel}</span>
        <strong>${totalSg}</strong>
      </div>
    </section>
  `;
}

function renderSummaryRail(summary) {
  const items = [
    { label: SG_LABELS.total, value: hasCourse() ? summary.totalSg : null, helper: '라운드' },
    { label: SG_LABELS.green, value: hasCourse() ? summary.greenSg : null, helper: '그린 전' },
    { label: SG_LABELS.putting, value: hasCourse() ? summary.puttingSg : null, helper: '그린 위' },
  ];

  return `
    <section class="summary-rail" aria-label="라운드 SG 요약">
      ${items
        .map(
          (item) => `
            <article class="summary-chip ${valueTone(item.value)}">
              <span>${item.label}</span>
              <strong>${formatSg(item.value, 1, '-')}</strong>
              <small>${item.helper}</small>
            </article>
          `,
        )
        .join('')}
    </section>
  `;
}

function renderCoursePicker() {
  const placeholder = coursesLoaded ? '골프장을 선택하세요' : '코스 목록 불러오는 중';
  const helper = courseLoadError
    ? '코스 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'
    : '코스를 선택하면 18개 홀의 빈 입력 화면이 준비됩니다.';

  return `
    <article class="app-card course-card">
      <div>
        <span class="overline">코스 선택</span>
        <h2>플레이할 골프장</h2>
      </div>
      <label class="course-select">
        <span>골프장</span>
        <select id="courseSelect" ${coursesLoaded && !courseLoadError ? '' : 'disabled'}>
          <option value="">${placeholder}</option>
          ${courses
            .map(
              (course) => `
                <option value="${escapeHtml(course.id)}" ${course.id === state.courseId ? 'selected' : ''}>
                  ${escapeHtml(course.name)}
                </option>
              `,
            )
            .join('')}
        </select>
      </label>
      <p>${helper}</p>
    </article>
  `;
}

function renderEmptyCard(title, body) {
  return `
    <article class="app-card empty-card">
      ${icon('golf')}
      <h2>${title}</h2>
      <p>${body}</p>
    </article>
  `;
}

function renderDashboardScreen() {
  const recentRounds = getRecentRounds(5);
  const cumulative = getCumulativeSummary(getSavedRoundModels());

  if (!recentRounds.length) {
    return `
      <section class="screen active-screen">
        <section class="summary-rail" aria-label="누적 SG 요약">
          <article class="summary-chip muted"><span>누적 SG</span><strong>-</strong><small>전체</small></article>
          <article class="summary-chip muted"><span>라운드</span><strong>0</strong><small>저장됨</small></article>
          <article class="summary-chip muted"><span>홀</span><strong>0</strong><small>분석됨</small></article>
        </section>
        ${renderEmptyCard('아직 저장된 라운드가 없습니다', '입력 모드에서 코스를 선택하고 스코어를 저장하면 누적 SG와 최근 5라운드 그래프가 여기에 표시됩니다.')}
      </section>
    `;
  }

  const graphRounds = [...recentRounds].reverse();
  const maxAbs = Math.max(...graphRounds.map((round) => Math.abs(round.round.summary.totalSg)), 1);

  return `
    <section class="screen active-screen">
      <section class="summary-rail" aria-label="누적 SG 요약">
        <article class="summary-chip ${valueTone(cumulative.totalSg)}">
          <span>누적 SG</span>
          <strong>${formatSg(cumulative.totalSg, 1, '-')}</strong>
          <small>전체</small>
        </article>
        <article class="summary-chip ${valueTone(cumulative.greenSg)}">
          <span>${SG_LABELS.green}</span>
          <strong>${formatSg(cumulative.greenSg, 1, '-')}</strong>
          <small>누적</small>
        </article>
        <article class="summary-chip ${valueTone(cumulative.puttingSg)}">
          <span>${SG_LABELS.putting}</span>
          <strong>${formatSg(cumulative.puttingSg, 1, '-')}</strong>
          <small>누적</small>
        </article>
      </section>

      <article class="app-card dashboard-card">
        <div class="card-head">
          <div>
            <span class="overline">최근 5라운드</span>
            <h2>라운드별 SG</h2>
          </div>
          <span class="round-count">${recentRounds.length}R</span>
        </div>
        <div class="sg-chart" aria-label="최근 5라운드 SG 그래프">
          ${graphRounds
            .map((record, index) => {
              const totalSg = record.round.summary.totalSg;
              const height = Math.max((Math.abs(totalSg) / maxAbs) * 112, 10);
              return `
                <div class="sg-bar-item">
                  <span class="sg-value ${valueTone(totalSg)}">${formatSg(totalSg, 1, '-')}</span>
                  <div class="sg-bar-track">
                    <i class="${totalSg >= 0 ? 'positive-bar' : 'negative-bar'}" style="height:${height}px"></i>
                  </div>
                  <strong>${index + 1}</strong>
                  <small>${escapeHtml(record.playedAt?.slice(5) ?? '-')}</small>
                </div>
              `;
            })
            .join('')}
        </div>
      </article>

      <div class="recent-round-list">
        ${recentRounds
          .map(
            (record) => `
              <article class="recent-round-row">
                <div>
                  <strong>${escapeHtml(record.courseName || '저장 라운드')}</strong>
                  <small>${escapeHtml(record.playedAt)} · ${record.round.summary.totalHolesCalculated}홀</small>
                </div>
                <span class="${valueTone(record.round.summary.totalSg)}">${formatSg(record.round.summary.totalSg, 1, '-')}</span>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderHolePicker(round) {
  if (!round.holes.length) {
    return '';
  }

  return `
    <nav class="hole-rail" aria-label="홀 선택">
      ${round.holes
        .map((hole) => {
          const isSelected = hole.holeNo === state.selectedHoleNo;
          return `
            <button type="button" class="hole-pill ${isSelected ? 'selected' : ''} ${valueTone(hole.sg?.totalSg)}" data-hole="${hole.holeNo}">
              <span>${hole.holeNo}</span>
              <small>${formatSg(hole.sg?.totalSg, 1, '-')}</small>
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

function renderPreviewSheet(hole, sg) {
  const reason = sg.reasonCode ? HOLE_REASON_COPY[sg.reasonCode] : null;
  const errors = sg.error?.codes ?? [];
  const isWaitingForScore = errors.includes('SCORE_INVALID') || errors.includes('PUTTS_INVALID');
  const invalidMessage = errors.includes('PUTTS_OVER_SCORE')
    ? '퍼트 수는 전체 스코어보다 클 수 없습니다.'
    : '';
  const title = isWaitingForScore ? '스코어 입력 대기' : reason?.label ?? '첫 퍼트 거리 필요';
  const sentence = isWaitingForScore
    ? '스코어와 퍼트 수를 입력하면 그린까지와 퍼팅을 분리해서 계산합니다.'
    : reason?.sentence ?? '첫 퍼트 거리를 입력하면 그린까지와 퍼팅을 분리해서 분석할 수 있습니다.';

  return `
    ${invalidMessage ? `<div class="validation">${invalidMessage}</div>` : ''}
    <article class="preview-sheet ${valueTone(sg.totalSg)}">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-head">
        <div>
          <span class="overline">SG 프리뷰</span>
          <h2>${title}</h2>
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
          <strong class="${valueTone(sg.totalSg)}">${formatSg(sg.totalSg, 2, '-')}</strong>
        </div>
      </div>
      <p>${sentence}</p>
      <div class="formula-strip">
        <span>Hole ${sg.holeExpected == null ? '-' : roundForDisplay(sg.holeExpected, 2)}</span>
        <span>Putt ${sg.puttExpected == null ? '-' : roundForDisplay(sg.puttExpected, 2)}</span>
        <span>Before ${sg.strokesBeforePutting ?? '-'}</span>
      </div>
    </article>
  `;
}

function renderInputScreen(round) {
  if (!hasCourse()) {
    return `
      <section class="screen active-screen">
        ${renderSummaryRail(round.summary)}
        ${renderCoursePicker()}
        ${renderEmptyCard('빈 라운드에서 시작합니다', '샘플 스코어는 넣지 않았습니다. 코스를 선택하면 1번부터 18번까지 직접 입력할 수 있습니다.')}
      </section>
    `;
  }

  const hole = selectedHole();
  const sg = selectedHoleSg();

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
              <p>정확하지 않으면 가까운 거리만 선택해도 분석합니다.</p>
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
                  hole.firstPuttDistanceM ?? FIRST_PUTT_BUCKETS[hole.firstPuttDistanceBucket]?.distanceM ?? null,
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
      </article>

      ${renderPreviewSheet(hole, sg)}
      <button type="button" class="primary-action save-round-action" id="saveRound" ${round.summary.totalHolesCalculated ? '' : 'disabled'}>저장</button>
    </section>
  `;
}

function renderReportScreen(round) {
  const recentRounds = getRecentRounds(5);
  const summary = recentRounds[0]?.round.summary ?? round.summary;

  if (!recentRounds.length && !hasCourse()) {
    return `
      <section class="screen active-screen">
        ${renderSummaryRail(summary)}
        ${renderEmptyCard('아직 리포트가 없습니다', '입력 모드에서 라운드를 저장하면 최근 5라운드 기준의 강점과 약점 리포트가 만들어집니다.')}
      </section>
    `;
  }

  const reportRounds = recentRounds.length ? recentRounds : [{ round, courseName: state.courseName, playedAt: state.playedAt }];
  const reportText = buildRecentReportText(reportRounds);
  const aggregate = getCumulativeSummary(reportRounds);

  return `
    <section class="screen active-screen">
      <article class="app-card insight-card">
        <span class="overline">최근 5라운드 리포트</span>
        <h2>${reportRounds.length}라운드 기준 SG 분석</h2>
        <p class="report-copy">${reportText}</p>
        <div class="insight-matrix">
          <div><span>누적 SG</span><strong class="${valueTone(aggregate.totalSg)}">${formatSg(aggregate.totalSg, 1, '-')}</strong></div>
          <div><span>최근 라운드</span><strong>${reportRounds.length}R</strong></div>
          <div><span>${SG_LABELS.green}</span><strong class="${valueTone(aggregate.greenSg)}">${formatSg(aggregate.greenSg, 1, '-')}</strong></div>
          <div><span>${SG_LABELS.putting}</span><strong class="${valueTone(aggregate.puttingSg)}">${formatSg(aggregate.puttingSg, 1, '-')}</strong></div>
        </div>
        ${
          state.completionMode
            ? '<button type="button" class="primary-action" id="completeReport">완료</button>'
            : ''
        }
      </article>

      <div class="hole-list recent-rounds-report">
        ${reportRounds
          .map(
            (record) => `
              <article class="hole-row">
                <span class="row-hole">${escapeHtml(record.playedAt?.slice(5) ?? '-')}</span>
                <span class="row-main">
                  <strong>${escapeHtml(record.courseName || '저장 라운드')}</strong>
                  <small>${record.round.summary.totalHolesCalculated}홀 · 그린 ${formatSg(record.round.summary.greenSg, 1, '-')} · 퍼팅 ${formatSg(record.round.summary.puttingSg, 1, '-')}</small>
                </span>
                <span class="row-sg ${valueTone(record.round.summary.totalSg)}">${formatSg(record.round.summary.totalSg, 1, '-')}</span>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function buildRecentReportText(records) {
  const aggregate = getCumulativeSummary(records);
  const bestArea = aggregate.greenSg >= aggregate.puttingSg ? SG_LABELS.green : SG_LABELS.putting;
  const weakArea = aggregate.greenSg < aggregate.puttingSg ? SG_LABELS.green : SG_LABELS.putting;
  const latest = records[0]?.round.summary.totalSg ?? 0;
  const oldest = records.at(-1)?.round.summary.totalSg ?? latest;
  const trend = latest >= oldest ? '최근 흐름은 안정적이거나 개선되는 방향' : '최근 흐름은 약간 내려가는 방향';
  const totalLabel = aggregate.totalSg >= 0 ? '전체적으로 기준보다 타수를 벌어 주는 경기력' : '전체적으로 기준보다 타수를 잃는 구간이 남아 있는 경기력';

  return `최근 ${records.length}라운드의 누적 SG는 ${formatSg(aggregate.totalSg, 1, '-')}로, ${totalLabel}입니다. 강점은 ${bestArea}입니다. 이 영역에서 ${formatSg(Math.max(aggregate.greenSg, aggregate.puttingSg), 1, '-')}를 기록해 스코어를 지키는 힘이 보입니다. 반대로 약점은 ${weakArea}입니다. ${formatSg(Math.min(aggregate.greenSg, aggregate.puttingSg), 1, '-')} 수준이라 좋은 흐름을 만든 뒤에도 일부 타수를 다시 내주는 패턴이 있습니다. ${trend}입니다. 실력을 더 올리려면 라운드 전에는 30~80m 어프로치와 1~2m 퍼트를 짧게 반복하고, 라운드 후에는 SG가 크게 낮았던 홀의 첫 퍼트 거리와 페널티 여부를 먼저 복기하세요. 다음 목표는 약점 영역에서 라운드당 1타를 줄이는 것입니다.`;
}

function renderTrendScreen(summary) {
  if (!hasCourse() || !summary.totalHolesCalculated) {
    return `
      <section class="screen active-screen">
        ${renderEmptyCard('추이는 아직 비어 있습니다', '라운드 저장 기능을 붙인 뒤 최근 라운드 흐름을 표시할 공간입니다. 지금은 현재 라운드 입력에 집중합니다.')}
      </section>
    `;
  }

  const maxAbs = Math.max(Math.abs(summary.greenSg), Math.abs(summary.puttingSg), Math.abs(summary.totalSg), 1);

  return `
    <section class="screen active-screen">
      <article class="app-card trend-card">
        <span class="overline">현재 라운드</span>
        <h2>SG 구성</h2>
        <div class="trend-list">
          <div class="trend-item">
            <span>그린</span>
            <div class="trend-track">
              <i class="green" style="width:${Math.max((Math.abs(summary.greenSg) / maxAbs) * 100, 8)}%"></i>
            </div>
            <strong class="${valueTone(summary.greenSg)}">${formatSg(summary.greenSg, 1)}</strong>
          </div>
          <div class="trend-item">
            <span>퍼팅</span>
            <div class="trend-track">
              <i class="putting" style="width:${Math.max((Math.abs(summary.puttingSg) / maxAbs) * 100, 8)}%"></i>
            </div>
            <strong class="${valueTone(summary.puttingSg)}">${formatSg(summary.puttingSg, 1)}</strong>
          </div>
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
      ${renderCoursePicker()}
      <article class="app-card settings-card">
        <span class="overline">설정</span>
        <h2>라운드 기준</h2>
        <label class="settings-field">
          <span>플레이일</span>
          <input id="playedAt" type="date" value="${state.playedAt}" />
        </label>
        <label class="settings-field">
          <span>핸디캡 ${state.handicapIndex}H</span>
          <input id="handicapIndex" type="range" min="0" max="36" step="1" value="${state.handicapIndex}" />
        </label>
        <button type="button" class="primary-action" id="resetRound">빈 라운드로 초기화</button>
      </article>
    </section>
  `;
}

function renderActiveScreen(round) {
  if (state.activeTab === 'dashboard') return renderDashboardScreen();
  if (state.activeTab === 'report') return renderReportScreen(round);
  if (state.activeTab === 'settings') return renderSettingsScreen();
  return renderInputScreen(round);
}

function renderBottomNav() {
  const tabs = [
    { key: 'dashboard', label: '대시보드', icon: 'trend' },
    { key: 'input', label: '입력 모드', icon: 'input' },
    { key: 'report', label: '리포트', icon: 'report' },
    { key: 'settings', label: '설정', icon: 'settings' },
  ];

  return `
    <nav class="bottom-nav" aria-label="앱 메뉴">
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
  syncSelectedHoleIntoView();
}

function syncSelectedHoleIntoView() {
  window.requestAnimationFrame(() => {
    document.querySelector('.hole-pill.selected')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => setState({ activeTab: button.dataset.tab, completionMode: false }));
  });

  document.querySelector('#courseSelect')?.addEventListener('change', (event) => {
    selectCourse(event.target.value);
  });

  document.querySelector('#handicapIndex')?.addEventListener('input', (event) => {
    setState({ handicapIndex: Number(event.target.value) });
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
      if (input.value.trim() === '') {
        updateHole(state.selectedHoleNo, { [field]: field === 'penalties' ? 0 : null });
        return;
      }

      const nextValue = Math.min(Math.max(Number(input.value), min), max);
      if (Number.isFinite(nextValue)) {
        updateHole(state.selectedHoleNo, { [field]: nextValue });
      }
    };

    stepper.querySelectorAll('[data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const step = Number(button.dataset.step);
        const baseValue = input.value.trim() === '' ? min - step : Number(input.value);
        const nextValue = Math.min(Math.max(baseValue + step, min), max);
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
    state = { ...clone(defaultState), handicapIndex: state.handicapIndex, savedRounds: state.savedRounds };
    saveState();
    render();
  });

  document.querySelector('#saveRound')?.addEventListener('click', () => {
    const round = calculateRoundSg(state.holes, state.handicapIndex);
    if (!round.summary.totalHolesCalculated) {
      return;
    }

    const savedRound = {
      id: `${Date.now()}`,
      savedAt: new Date().toISOString(),
      playedAt: state.playedAt,
      courseId: state.courseId,
      courseName: state.courseName,
      handicapIndex: state.handicapIndex,
      holes: clone(state.holes),
    };

    state = {
      ...state,
      savedRounds: [savedRound, ...state.savedRounds].slice(0, 50),
      activeTab: 'report',
      completionMode: true,
    };
    saveState();
    render();
  });

  document.querySelector('#completeReport')?.addEventListener('click', () => {
    setState({ activeTab: 'dashboard', completionMode: false });
  });
}

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

render();
loadCourses();
