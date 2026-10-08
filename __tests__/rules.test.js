import { validateCourse } from '@/lib/rules';

const members = [
  { id: 'a', memberId: 'm1', name: 'A' },
  { id: 'b', memberId: 'm1', name: 'B' },
];

test('같은 사람 캐릭 2개는 기본 차단', () => {
  const codes = validateCourse({ members, stepKeys: ['swoo:extreme'] }).map((e) => e.code);
  expect(codes).toContain('same_member');
});

test('허용 옵션이면 통과', () => {
  expect(validateCourse({ members, stepKeys: ['swoo:extreme'], allowSameMember: true })).toEqual([]);
});

test('같은 기간 같은 보스 중복 배정 차단', () => {
  const codes = validateCourse({
    members: [members[0]],
    stepKeys: ['swoo:extreme'],
    assignedByCharacter: { a: ['swoo:extreme'] },
  }).map((e) => e.code);
  expect(codes).toEqual(['duplicate_boss']);
});
