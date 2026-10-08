import { indexCuts, rateOf, judge, rankForBoss, partyRate, checkCourse, VERDICT } from '@/lib/rates';

const cuts = indexCuts([
  { bossKey: 'swoo:extreme', baseSpec: 126000 },
  { bossKey: 'seren:extreme', baseSpec: 250000 },
]);

const a = { id: 'a', memberId: 'm1', hexaSpec: 63000, bossRates: {} };
const b = { id: 'b', memberId: 'm2', hexaSpec: 70000, bossRates: { 'swoo:extreme': 60 } };
const c = { id: 'c', memberId: 'm3', hexaSpec: null, bossRates: {} };

test('공급자 배율이 컷표보다 우선', () => {
  expect(rateOf(b, 'swoo:extreme', cuts)).toEqual({ value: 60, source: 'provider' });
});

test('공급자 값이 없으면 컷표로 환산', () => {
  expect(rateOf(a, 'swoo:extreme', cuts)).toEqual({ value: 50, source: 'cut' });
});

test('환산·컷 둘 다 없으면 null', () => {
  expect(rateOf(c, 'swoo:extreme', cuts)).toBeNull();
  expect(rateOf(a, 'lucid:hard', cuts)).toBeNull();
});

test('판정 기준', () => {
  expect(judge(100)).toBe(VERDICT.OK);
  expect(judge(95)).toBe(VERDICT.TIGHT);
  expect(judge(89.9)).toBe(VERDICT.NO);
  expect(judge(null)).toBe(VERDICT.UNKNOWN);
});

test('보스별 줄 세우기: 높은 배율 먼저, 모르는 캐릭은 뒤', () => {
  const ranked = rankForBoss([a, c, b], 'swoo:extreme', cuts).map((r) => r.character.id);
  expect(ranked).toEqual(['b', 'a', 'c']);
});

test('파티 배율은 합, 한 명이라도 모르면 null', () => {
  expect(partyRate([a, b], 'swoo:extreme', cuts)).toBe(110);
  expect(partyRate([a, c], 'swoo:extreme', cuts)).toBeNull();
});

test('코스 판정은 가장 나쁜 보스 기준', () => {
  const r = checkCourse([a, b], ['swoo:extreme', 'seren:extreme'], cuts);
  expect(r.steps[0].verdict).toBe(VERDICT.OK);
  expect(r.steps[1].partyRate).toBeCloseTo(53.2);
  expect(r.verdict).toBe(VERDICT.NO);
});
