// 파티 추천 (PLAN.md §8)
// 같은 보스를 목표로 하고, 코스 보스들에서 배율이 비슷하고, 시간이 겹치는 다른 사람 캐릭터를 점수순으로.

import { rateOf } from './rates';

// 가중치 [가정 — 실제 데이터 보고 조정]
export const WEIGHTS = { overlap: 0.5, spec: 0.35, time: 0.15 };

function specCloseness(base, candidate, keys, ctx) {
  const scores = [];
  for (const key of keys) {
    const a = rateOf(base, key, ctx);
    const b = rateOf(candidate, key, ctx);
    if (!a || !b || a.value <= 0 || b.value <= 0) continue;
    scores.push(Math.max(0, 1 - Math.abs(Math.log(b.value / a.value))));
  }
  if (!scores.length) return null;
  return scores.reduce((s, x) => s + x, 0) / scores.length;
}

function timeOverlap(slotsA = {}, slotsB = {}) {
  const a = Object.keys(slotsA).filter((k) => slotsA[k]);
  if (!a.length) return 0;
  const common = a.filter((k) => slotsB[k]).length;
  return common / a.length;
}

/**
 * @param {object} p
 * @param {string[]} p.stepKeys 코스 보스 키 목록
 * @param {object} p.base 기준 캐릭터
 * @param {object[]} p.characters 전체 캐릭터
 * @param {Record<string, string[]>} p.goalsByCharacter 캐릭터 id → 이번 기간 목표 보스 키
 * @param {Record<string, string[]>} p.assignedByCharacter 캐릭터 id → 이미 다른 코스에 배정된 보스 키
 * @param {Record<string, object>} p.slotsByMember 멤버 id → 이번 주 가능 시간 슬롯
 * @param {object} p.ctx makeRateContext 결과
 */
export function recommend({
  stepKeys,
  base,
  characters,
  goalsByCharacter = {},
  assignedByCharacter = {},
  slotsByMember = {},
  ctx,
}) {
  const results = [];
  for (const c of characters) {
    if (c.id === base.id || c.memberId === base.memberId) continue;
    const goals = new Set(goalsByCharacter[c.id] || []);
    const assigned = new Set(assignedByCharacter[c.id] || []);
    const shared = stepKeys.filter((k) => goals.has(k) && !assigned.has(k));
    if (!shared.length) continue;

    const overlap = shared.length / stepKeys.length;
    const spec = specCloseness(base, c, stepKeys, ctx);
    const time = timeOverlap(slotsByMember[base.memberId], slotsByMember[c.memberId]);
    const score = WEIGHTS.overlap * overlap + WEIGHTS.spec * (spec ?? 0) + WEIGHTS.time * time;

    results.push({
      character: c,
      score,
      overlap,
      spec,
      time,
      sharedKeys: shared,
      missingKeys: stepKeys.filter((k) => !shared.includes(k)),
    });
  }
  return results.sort((a, b) => b.score - a.score);
}
