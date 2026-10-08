import { getSpecProvider, normalizeManualSpec, SpecProviderNotReady, maplescouterUrl } from '@/lib/spec/provider';

test('기본 공급자는 manual', () => {
  expect(getSpecProvider(undefined).id).toBe('manual');
  expect(getSpecProvider('unknown').id).toBe('manual');
});

test('maplescouter 공급자는 조회 방식 확정 전까지 호출 불가', async () => {
  await expect(getSpecProvider('maplescouter').fetchSpec('닉')).rejects.toBeInstanceOf(SpecProviderNotReady);
});

test('수동 입력 정리: 쉼표·% 제거, 잘못된 배율은 버림', () => {
  expect(normalizeManualSpec({ hexaSpec: '63,000', bossRates: { 'swoo:extreme': '52.3%', 'x:y': 'abc' } })).toEqual({
    hexaSpec: 63000,
    bossRates: { 'swoo:extreme': 52.3 },
  });
  expect(() => normalizeManualSpec({ hexaSpec: '' })).toThrow();
});

test('결과 페이지 링크', () => {
  expect(maplescouterUrl('집사0')).toBe('https://maplescouter.com/ko/info?name=%EC%A7%91%EC%82%AC0');
});
