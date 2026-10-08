import { defenseFactor, bossPower, calibrateHexa, estimateHexa, deriveCuts } from '@/lib/estimate';
import { makeRateContext, rateOf, hexaOf, baseOf } from '@/lib/rates';

// 집사0 실제 API 값 (2026-10-08)
const jipsaStats = { statAttackMax: 68092597, damage: 149, bossDamage: 377, ignoreDefense: 91.28 };
// 으낭다 실제 API 값: 방무 26.9%
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
