// 보스 배율(%) 계산과 줄 세우기 (ADR-0009)
//
// 배율 출처 우선순위
//   1. 공급자 값: character.bossRates[bossKey] (maplescouter 등에서 가져온 보스별 배율)
//   2. 컷표 환산: 헥사 환산 ÷ 컷표의 100% 기준 환산(base_spec) × 100
//
// 파티 판정: 파티원 배율 합이 기준 이상이면 가능 [가정 — 실제 데이터 보고 조정]

import { maxPartyOf } from './bosses';

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

// 캐릭터 한 명의 보스 배율 → { value, source } 또는 null
export function rateOf(character, key, cutIndex) {
  const fromProvider = character?.bossRates?.[key];
  if (typeof fromProvider === 'number' && Number.isFinite(fromProvider)) {
    return { value: fromProvider, source: 'provider' };
  }
  const base = cutIndex?.get(key);
  const spec = Number(character?.hexaSpec);
  if (base && spec > 0) {
    return { value: (spec / base) * 100, source: 'cut' };
  }
  return null;
}

export function judge(value, thresholds = THRESHOLDS) {
  if (value == null) return VERDICT.UNKNOWN;
  if (value >= thresholds.clear) return VERDICT.OK;
  if (value >= thresholds.tight) return VERDICT.TIGHT;
  return VERDICT.NO;
}

// 보스 하나 기준으로 캐릭터 줄 세우기 (배율 높은 순, 배율 모르는 캐릭은 뒤)
export function rankForBoss(characters, key, cutIndex) {
  return characters
    .map((c) => ({ character: c, rate: rateOf(c, key, cutIndex) }))
    .sort((a, b) => (b.rate?.value ?? -Infinity) - (a.rate?.value ?? -Infinity));
}

// 파티 배율 = 파티원 배율 합. 한 명이라도 모르면 null
export function partyRate(members, key, cutIndex) {
  let sum = 0;
  for (const m of members) {
    const r = rateOf(m, key, cutIndex);
    if (!r) return null;
    sum += r.value;
  }
  return sum;
}

// 코스(보스 체인) 판정: 보스마다 파티 배율·판정·인원 초과 여부
export function checkCourse(members, stepKeys, cutIndex, thresholds = THRESHOLDS) {
  const steps = stepKeys.map((key) => {
    const value = partyRate(members, key, cutIndex);
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
