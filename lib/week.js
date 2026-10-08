// 주차·월 기간 계산 (ADR-0005)
// 초기화 시각은 미확인 → 상수로만 관리. 값이 확인되면 여기만 고친다.

export const WEEK_RESET = { weekday: 4 /* 목 */, hour: 0 };
export const MONTH_RESET = { day: 1, hour: 0 };
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');

// Date → KST 기준 벽시계 값을 UTC 필드에 담은 Date
function toKst(date) {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function fromKst(kstDate) {
  return new Date(kstDate.getTime() - KST_OFFSET_MS);
}

function ymd(kstDate) {
  return `${kstDate.getUTCFullYear()}-${pad(kstDate.getUTCMonth() + 1)}-${pad(kstDate.getUTCDate())}`;
}

// 해당 시점이 속한 주차의 시작 시각 (UTC Date)
export function weekStartAt(date = new Date()) {
  const k = toKst(date);
  const start = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), WEEK_RESET.hour));
  let diff = (k.getUTCDay() - WEEK_RESET.weekday + 7) % 7;
  if (diff === 0 && k.getTime() < start.getTime()) diff = 7;
  start.setUTCDate(start.getUTCDate() - diff);
  return fromKst(start);
}

// 주차 키: 주차 시작일(KST) 'YYYY-MM-DD'
export function weekKey(date = new Date()) {
  return ymd(toKst(weekStartAt(date)));
}

// 월 키: 'YYYY-MM' (월 초기화 시각 기준)
export function monthKey(date = new Date()) {
  const k = toKst(date);
  const start = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), MONTH_RESET.day, MONTH_RESET.hour));
  if (k.getTime() < start.getTime()) start.setUTCMonth(start.getUTCMonth() - 1);
  return `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}`;
}

// 보스 주기에 맞는 기간 키
export function periodOf(date, cycle) {
  return cycle === 'monthly' ? monthKey(date) : weekKey(date);
}

// 주차 키 → 다음/이전 주차 키
export function shiftWeek(key, weeks) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + weeks * 7));
  return ymd(t);
}
