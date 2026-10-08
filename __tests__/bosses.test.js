import { BOSSES, bossKey, isValidBossKey, bossLabel, maxPartyOf, getBoss } from '@/lib/bosses';

test('보스 id는 중복 없음', () => {
  const ids = BOSSES.map((b) => b.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('키 검증과 표시 이름', () => {
  expect(isValidBossKey(bossKey('swoo', 'extreme'))).toBe(true);
  expect(isValidBossKey('swoo:chaos')).toBe(false);
  expect(isValidBossKey('nope:normal')).toBe(false);
  expect(bossLabel('swoo:extreme')).toBe('익스트림 스우');
});

test('검은 마법사는 월간', () => {
  expect(getBoss('blackmage').cycle).toBe('monthly');
});

test('최대 인원 미확인이면 null', () => {
  expect(maxPartyOf('swoo:extreme')).toBeNull();
});
