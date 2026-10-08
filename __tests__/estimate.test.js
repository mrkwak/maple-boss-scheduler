import { defenseFactor, bossPower, calibrate, estimateRate } from '@/lib/estimate';
import { makeRateContext, rateOf } from '@/lib/rates';

// 집사0 실제 API 값 (2026-10-08)
const jipsa = {
  id: 'j',
  statAttackMax: 68092597,
  damage: 149,
  bossDamage: 377,
  ignoreDefense: 91.28,
};

test('방어율 보정', () => {
  expect(defenseFactor(91.28, 380)).toBeCloseTo(1 - 3.8 * 0.0872);
  expect(defenseFactor(50, 380)).toBe(0);
  expect(defenseFactor(90, null)).toBe(1);
});

test('보스 딜: 보공 반영 + 방어율 보정', () => {
  const p = bossPower(jipsa, 'swoo:extreme');
  const expected = 68092597 * ((1 + 1.49 + 3.77) / (1 + 1.49)) * (1 - 3.8 * 0.0872);
  expect(p).toBeCloseTo(expected);
  expect(bossPower({}, 'swoo:extreme')).toBeNull();
  // 으낭다 실제 값: 방무 26.9%로는 방어율 380% 보스에 딜이 안 들어감
  expect(bossPower({ statAttackMax: 124549, damage: 35, bossDamage: 34, ignoreDefense: 26.9 }, 'swoo:extreme')).toBe(0);
});

test('직접 배율 한 개로 기준값 역산 → 같은 캐릭은 같은 배율로 되돌아옴', () => {
  const chars = [{ id: 'a', apiStats: jipsa, bossRates: { 'swoo:extreme': 250 } }];
  const cal = calibrate(chars);
  expect(cal['swoo:extreme'].samples).toBe(1);
  expect(estimateRate({ apiStats: jipsa }, 'swoo:extreme', cal)).toBeCloseTo(250);
});

test('방무가 낮은 캐릭은 같은 스탯공격력이어도 배율이 낮게 추정', () => {
  const cal = calibrate([{ apiStats: jipsa, bossRates: { 'swoo:extreme': 250 } }]);
  const low = estimateRate({ apiStats: { ...jipsa, ignoreDefense: 85 } }, 'swoo:extreme', cal);
  expect(low).toBeLessThan(250);
});

test('기준값 없는 보스는 추정 안 함, 여러 샘플이면 중앙값', () => {
  const cal = calibrate([
    { apiStats: { statAttackMax: 100 }, bossRates: { 'will:hard': 100 } },
    { apiStats: { statAttackMax: 200 }, bossRates: { 'will:hard': 100 } },
    { apiStats: { statAttackMax: 300 }, bossRates: { 'will:hard': 100 } },
  ]);
  expect(cal['will:hard']).toEqual({ base: 200, samples: 3 });
  expect(estimateRate({ apiStats: jipsa }, 'lucid:hard', cal)).toBeNull();
});

test('우선순위: 직접 값 > 추정 > 컷표', () => {
  const sample = { id: 'a', apiStats: jipsa, hexaSpec: 100000, bossRates: { 'swoo:extreme': 250 } };
  const other = { id: 'b', apiStats: { ...jipsa, statAttackMax: 34046298 }, hexaSpec: 50000, bossRates: {} };
  const ctx = makeRateContext({ cuts: [{ bossKey: 'swoo:extreme', baseSpec: 50000 }], characters: [sample, other] });
  expect(rateOf(sample, 'swoo:extreme', ctx).source).toBe('direct');
  const est = rateOf(other, 'swoo:extreme', ctx);
  expect(est.source).toBe('estimate');
  expect(est.value).toBeCloseTo(125);
  expect(rateOf({ hexaSpec: 50000 }, 'swoo:extreme', ctx)).toEqual({ value: 100, source: 'cut' });
});
