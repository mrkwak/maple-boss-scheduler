import { recommend } from '@/lib/matching';
import { indexCuts } from '@/lib/rates';

const cutIndex = indexCuts([
  { bossKey: 'swoo:extreme', baseSpec: 100000 },
  { bossKey: 'kaling:normal', baseSpec: 80000 },
]);
const stepKeys = ['swoo:extreme', 'kaling:normal'];
const base = { id: 'me', memberId: 'm1', hexaSpec: 60000 };
const characters = [
  base,
  { id: 'mine2', memberId: 'm1', hexaSpec: 60000 },
  { id: 'close', memberId: 'm2', hexaSpec: 62000 },
  { id: 'far', memberId: 'm3', hexaSpec: 150000 },
  { id: 'nogoal', memberId: 'm4', hexaSpec: 60000 },
];
const goalsByCharacter = {
  mine2: stepKeys,
  close: stepKeys,
  far: stepKeys,
  nogoal: ['lucid:hard'],
};

test('같은 사람·목표 없는 캐릭은 제외, 스펙 가까운 순', () => {
  const ids = recommend({ stepKeys, base, characters, goalsByCharacter, cutIndex }).map((r) => r.character.id);
  expect(ids).toEqual(['close', 'far']);
});

test('이미 다른 코스에 배정된 보스는 겹침에서 빠짐', () => {
  const [r] = recommend({
    stepKeys,
    base,
    characters: [base, characters[2]],
    goalsByCharacter,
    assignedByCharacter: { close: ['swoo:extreme'] },
    cutIndex,
  });
  expect(r.sharedKeys).toEqual(['kaling:normal']);
  expect(r.missingKeys).toEqual(['swoo:extreme']);
});

test('시간이 겹치면 점수가 오름', () => {
  const slotsByMember = { m1: { 'thu-21': true, 'thu-22': true }, m2: { 'thu-21': true } };
  const [withTime] = recommend({ stepKeys, base, characters: [base, characters[2]], goalsByCharacter, slotsByMember, cutIndex });
  const [noTime] = recommend({ stepKeys, base, characters: [base, characters[2]], goalsByCharacter, cutIndex });
  expect(withTime.time).toBe(0.5);
  expect(withTime.score).toBeGreaterThan(noTime.score);
});
