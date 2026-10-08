import { defenseFactor, bossPower, calibrateHexa, estimateHexa, deriveCuts } from '@/lib/estimate';
import { makeRateContext, rateOf, hexaOf, baseOf } from '@/lib/rates';

// 집사0 실제 API 값 (2026-10-08)
const jipsaStats = { statAttackMax: 68092597, damage: 149, bossDamage: 377, ignoreDefense: 91.28 };
// 방무가 낮은 캐릭터 예시: 방무 26.9%
const lowIgnoreStats = { statAttackMax: 124549, damage: 35, bossDamage: 34, ignoreDefense: 26.9 };

test('방어율 보정', () => {
  expect(defenseFactor(91.28, 380)).toBeCloseTo(1 - 3.8 * 0.0872);
  expect(defenseFactor(50, 380)).toBe(0);
  expect(defenseFactor(90, null)).toBe(1);
});

test('보스 딜: 보공 반영 + 방어율 380% 기준, 방무 부족이면 0', () => {
  const expected = 68092597 * ((1 + 1.49 + 3.77) / (1 + 1.49)) * (1 - 3.8 * 0.0872);
  expect(bossPower(jipsaStats)).toBeCloseTo(expected);
  expect(bossPower(lowIgnoreStats)).toBe(0);
  expect(bossPower({})).toBeNull();
});

test('헥사환산 하나로 k 역산 → 같은 캐릭은 같은 값으로 되돌아옴', () => {
  const cal = calibrateHexa([{ hexaSpec: 69452, apiStats: jipsaStats }]);
  expect(cal.samples).toBe(1);
  expect(estimateHexa({ apiStats: jipsaStats }, cal)).toBeCloseTo(69452);
  expect(estimateHexa({ apiStats: { ...jipsaStats, statAttackMax: 34046298.5 } }, cal)).toBeCloseTo(69452 / 2);
});

test('보스 기준값 = 헥사환산 ÷ 배율 (스크린샷 예: 69,452 · 89.94%)', () => {
  const cuts = deriveCuts([{ hexaSpec: 69452, bossRates: { 'seren:extreme': 89.94 } }]);
  expect(cuts['seren:extreme'].base).toBeCloseTo(77220, -1);
});

test('출처: 직접 > 입력 헥사 계산 > 추정 헥사 계산', () => {
  const jipsa = { id: 'j', hexaSpec: 69452, apiStats: jipsaStats, bossRates: { 'seren:extreme': 89.94 } };
  const typed = { id: 't', hexaSpec: 77220, bossRates: {} };
  const half = { id: 'h', apiStats: { ...jipsaStats, statAttackMax: 34046298.5 }, bossRates: {} };
  const ctx = makeRateContext({ characters: [jipsa, typed, half] });

  expect(rateOf(jipsa, 'seren:extreme', ctx)).toEqual({ value: 89.94, source: 'direct' });
  const t = rateOf(typed, 'seren:extreme', ctx);
  expect(t.source).toBe('cut');
  expect(t.value).toBeCloseTo(100, 0);
  const h = rateOf(half, 'seren:extreme', ctx);
  expect(h.source).toBe('estimate');
  expect(h.value).toBeCloseTo(89.94 / 2, 1);
  expect(hexaOf(half, ctx).source).toBe('estimate');
  expect(rateOf(half, 'lucid:hard', ctx)).toBeNull();
});

test('컷표에 적은 값이 역산값보다 우선', () => {
  const ctx = makeRateContext({
    cuts: [{ bossKey: 'seren:extreme', baseSpec: 70000 }],
    characters: [{ hexaSpec: 69452, bossRates: { 'seren:extreme': 89.94 } }],
  });
  expect(baseOf('seren:extreme', ctx)).toEqual({ base: 70000, source: 'table' });
});

test('직업 보정: 렌선남아 실제 값 — 집사0(아란) 기준값으로 계산하면 낮게 나오던 것을 보정', () => {
  const cuts = [
    { bossKey: 'swoo:extreme', baseSpec: 57304 },
    { bossKey: 'seren:extreme', baseSpec: 195474 },
    { bossKey: 'kaling:normal', baseSpec: 69649 },
  ];
  // 렌선남아 화면 값 (2026-10-08 사용자 저장 파일): 헥사 76,918, 익스 스우 153.6%, 익스 세렌 44.41%
  const ren = { id: 'r', className: '렌', hexaSpec: 76918, bossRates: { 'swoo:extreme': 153.6, 'seren:extreme': 44.41 } };
  const ren2 = { id: 'r2', className: '렌', hexaSpec: 76918, bossRates: {} };
  const aran = { id: 'a', className: '아란', hexaSpec: 69452, bossRates: {} };
  const ctx = makeRateContext({ cuts, characters: [ren, ren2, aran] });
  expect(ctx.classFactors['렌'].factor).toBeCloseTo(1.1, 1);
  // 직접 값이 없는 노말 카링: 보정 없으면 110.4%, 화면 값은 124.9%
  expect(rateOf(ren2, 'kaling:normal', ctx).value).toBeGreaterThan(118);
  // 보정 계수 없는 직업은 그대로
  expect(rateOf(aran, 'kaling:normal', ctx).value).toBeCloseTo(99.7, 1);
});

test('헥사환산 추정 비율은 직업별, 없는 직업은 전체 중앙값', () => {
  const a = { className: '아란', hexaSpec: 100, apiStats: { statAttackMax: 100 } };
  const r = { className: '렌', hexaSpec: 300, apiStats: { statAttackMax: 100 } };
  const cal = calibrateHexa([a, r]);
  expect(estimateHexa({ className: '렌', apiStats: { statAttackMax: 50 } }, cal)).toBeCloseTo(150);
  expect(estimateHexa({ className: '아란', apiStats: { statAttackMax: 50 } }, cal)).toBeCloseTo(50);
  expect(estimateHexa({ className: '비숍', apiStats: { statAttackMax: 50 } }, cal)).toBeCloseTo(100);
});

test('컷표에 없는 보스 기준값은 직업 보정 반영해 기준 직업 단위로 역산', () => {
  // 렌: 컷표 보스(익스 스우)에서 보정 1.33 → 컷표 없는 익스 칼로스 기준값 = 76918 × 1.33 / 0.1602
  const ren = { className: '렌', hexaSpec: 76918, bossRates: { 'swoo:extreme': 153.6, 'kalos:extreme': 16.02 } };
  const aran = { className: '아란', hexaSpec: 69452, bossRates: {} };
  const ctx = makeRateContext({ cuts: [{ bossKey: 'swoo:extreme', baseSpec: 57304 }], characters: [ren, aran] });
  const f = ctx.classFactors['렌'].factor;
  expect(ctx.derived['kalos:extreme'].base).toBeCloseTo((76918 * f) / 0.1602, -1);
  // 아란(보정 1)의 익스 칼로스는 렌 기준값 그대로보다 낮아야 함
  expect(rateOf(aran, 'kalos:extreme', ctx).value).toBeLessThan((69452 / (76918 / 0.1602)) * 100);
});
