import { openParties, PARTY, partyState } from '@/lib/party';

const chars = [
  { id: 'a', memberId: 'm1' },
  { id: 'a2', memberId: 'm1' },
  { id: 'b', memberId: 'm2' },
  { id: 'c', memberId: 'm3' },
];
const course = (id, characterIds, partySize, extra = {}) => ({
  id,
  characterIds,
  partySize,
  startAt: null,
  status: 'planned',
  steps: [{ bossKey: 'kaling:normal', cleared: false }],
  ...extra,
});

test('상태: 모집 중 / 시간 미정 / 확정, 목표 인원 없으면 다 찬 것', () => {
  expect(partyState(course('1', ['a'], 3))).toBe(PARTY.RECRUITING);
  expect(partyState(course('2', ['a', 'b'], 2))).toBe(PARTY.NEED_TIME);
  expect(partyState(course('3', ['a', 'b'], 2, { startAt: '2026-10-10T12:00:00Z' }))).toBe(PARTY.FIXED);
  expect(partyState(course('4', ['a'], null, { startAt: '2026-10-10T12:00:00Z' }))).toBe(PARTY.FIXED);
});

test('합류 후보: 같은 보스·인원·모집 중, 내 다른 캐릭 있는 파티 제외, 시간 겹침 순', () => {
  const courses = [
    course('x', ['b'], 3),
    course('y', ['c'], 3),
    course('full', ['b', 'c'], 2),
    course('mine', ['a2'], 3),
    course('other-size', ['b'], 4),
    course('other-boss', ['b'], 3, { steps: [{ bossKey: 'swoo:extreme' }] }),
  ];
  const slotsByMember = { m1: { '0-21': true, '0-22': true }, m2: { '0-21': true }, m3: { '0-21': true, '0-22': true } };
  const out = openParties({ courses, bossKey: 'kaling:normal', size: 3, me: chars[0], characters: chars, slotsByMember });
  expect(out.map((o) => o.course.id)).toEqual(['y', 'x']);
});
