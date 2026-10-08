// 보스 배율(%) 계산과 줄 세우기 (ADR-0009)
//
// 배율 출처
//   direct   — character.bossRates[bossKey] (maplescouter에서 가져오거나 사람이 옮겨 적은 배율)
//   cut      — 입력한 헥사환산 ÷ 보스 기준값
//   estimate — 넥슨 API 스탯으로 추정한 헥사환산 ÷ 보스 기준값 (lib/estimate.js)
// 보스 기준값(100% 기준 헥사환산) = boss_cuts에 적은 값, 없으면 직접 배율로 역산한 값
// 직업 보정 = 같은 직업의 직접 배율로 구한 계수 (없으면 1), 어센틱포스 보정 — lib/estimate.js
//
// ctx = makeRateContext({ cuts, characters }) 를 만들어 넘긴다.
//
// 파티 판정: 파티원 배율 합이 기준 이상이면 가능 [가정 — 실제 데이터 보고 조정]

import { authForceOf, bossLevelOf, maxPartyOf } from './bosses';
import { calibrateHexa, deriveClassFactors, deriveCuts, estimateHexa, forceFactor, levelFactor } from './estimate';

export const VERDICT = { OK: 'ok', TIGHT: 'tight', NO: 'no', UNKNOWN: 'unknown' };

// 가능/빠듯 기준 (%). [가정]
export const THRESHOLDS = { clear: 100, tight: 90 };

// cuts: [{ bossKey, baseSpec }] → Map
export function indexCuts(cuts = []) {
  const map = new Map();
  for (const c of cuts) {
    const base = Number(c.baseSpec);
    if (c.bossKey && base > 0) map.set(c.bossKey, base);
  }
  return map;
}

// cuts: boss_cuts 행, characters: 역산용 전체 캐릭터
export function makeRateContext({ cuts = [], characters = [] } = {}) {
  const table = indexCuts(cuts);
  const ctx = { cuts: table, derived: {}, hexaCal: calibrateHexa(characters), classFactors: {} };
  // 1) 직업 보정은 컷표 기준값으로만 계산 (기준 직업 = 컷표를 만든 직업)
  ctx.classFactors = deriveClassFactors(characters, (key) => table.get(key) ?? null, forceFactorOf);
  // 2) 컷표에 없는 보스는 직업·포스 보정을 반영해 기준 단위로 역산
  ctx.derived = deriveCuts(characters, (c) => classFactorOf(c, ctx), forceFactorOf);
  return ctx;
}

// 어센틱포스 × 레벨 보정 (상한 대비). 입장 불가면 0
export function forceFactorOf(character, key) {
  return (
    forceFactor(character?.apiStats?.authenticForce, authForceOf(key)) * levelFactor(character?.level, bossLevelOf(key))
  );
}

export function canEnter(character, key) {
  const lv = bossLevelOf(key);
  return !(character?.level > 0 && lv > 0 && character.level < lv);
}

export function classFactorOf(character, ctx) {
  return ctx?.classFactors?.[character?.className]?.factor ?? 1;
}

// 보스 기준값 → { base, source: 'table'|'derived' } 또는 null
export function baseOf(key, ctx) {
  const table = ctx?.cuts?.get(key);
  if (table) return { base: table, source: 'table' };
  const d = ctx?.derived?.[key];
  return d ? { base: d.base, source: 'derived', samples: d.samples } : null;
}

// 헥사환산 → { value, source: 'input'|'estimate' } 또는 null
export function hexaOf(character, ctx) {
  const spec = Number(character?.hexaSpec);
  if (spec > 0) return { value: spec, source: 'input' };
  const est = estimateHexa(character, ctx?.hexaCal);
  return est == null ? null : { value: est, source: 'estimate' };
}

// 캐릭터 한 명의 보스 배율 → { value, source: 'direct'|'cut'|'estimate'|'blocked'(레벨 부족 입장 불가) } 또는 null
export function rateOf(character, key, ctx) {
  if (!canEnter(character, key)) return { value: 0, source: 'blocked' };
  const direct = character?.bossRates?.[key];
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return { value: direct, source: 'direct' };
  }
  const base = baseOf(key, ctx);
  const hexa = hexaOf(character, ctx);
  if (!base || !hexa) return null;
  const value = ((hexa.value * classFactorOf(character, ctx) * forceFactorOf(character, key)) / base.base) * 100;
  return { value, source: hexa.source === 'input' ? 'cut' : 'estimate' };
}

export function judge(value, thresholds = THRESHOLDS) {
  if (value == null) return VERDICT.UNKNOWN;
  if (value >= thresholds.clear) return VERDICT.OK;
  if (value >= thresholds.tight) return VERDICT.TIGHT;
  return VERDICT.NO;
}

// 보스 하나 기준으로 캐릭터 줄 세우기 (배율 높은 순, 배율 모르는 캐릭은 뒤)
export function rankForBoss(characters, key, ctx) {
  return characters
    .map((c) => ({ character: c, rate: rateOf(c, key, ctx) }))
    .sort((a, b) => (b.rate?.value ?? -Infinity) - (a.rate?.value ?? -Infinity));
}

// 파티 배율 = 파티원 배율 합. 한 명이라도 모르면 null
export function partyRate(members, key, ctx) {
  let sum = 0;
  for (const m of members) {
    const r = rateOf(m, key, ctx);
    if (!r) return null;
    sum += r.value;
  }
  return sum;
}

// 코스(보스 체인) 판정: 보스마다 파티 배율·판정·인원 초과 여부
export function checkCourse(members, stepKeys, ctx, thresholds = THRESHOLDS) {
  const steps = stepKeys.map((key) => {
    const value = partyRate(members, key, ctx);
    const maxParty = maxPartyOf(key);
    return {
      bossKey: key,
      partyRate: value,
      verdict: judge(value, thresholds),
      overCapacity: maxParty != null && members.length > maxParty,
    };
  });
  const order = [VERDICT.NO, VERDICT.UNKNOWN, VERDICT.TIGHT, VERDICT.OK];
  const worst = steps.reduce(
    (w, s) => (order.indexOf(s.verdict) < order.indexOf(w) ? s.verdict : w),
    VERDICT.OK,
  );
  return { steps, verdict: steps.length ? worst : VERDICT.UNKNOWN };
}
