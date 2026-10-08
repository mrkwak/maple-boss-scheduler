import { createMemoryAdapter } from '@/lib/db/memory';
import { setGoals, listGoals, copyLastWeek, currentPeriods } from '@/lib/services/goals';

// 2026-10-09(금) KST → 주차 2026-10-08, 월 2026-10
const now = new Date('2026-10-09T03:00:00Z');
const nextWeek = new Date('2026-10-16T03:00:00Z');

function setup() {
  const db = createMemoryAdapter({ characters: [{ id: 'c1', member_id: 'm1', name: '집사0' }] });
  return db;
}

test('주간·월간을 보스 주기대로 나눠 저장', async () => {
  const db = setup();
  await setGoals(db, 'c1', ['swoo:extreme', 'kaling:normal', 'blackmage:hard'], now);
  expect(currentPeriods(now)).toEqual({ week: '2026-10-08', month: '2026-10' });
  const goals = await listGoals(db, ['2026-10-08', '2026-10']);
  expect(goals).toEqual(
    expect.arrayContaining([
      { characterId: 'c1', period: '2026-10-08', bossKey: 'swoo:extreme' },
      { characterId: 'c1', period: '2026-10-08', bossKey: 'kaling:normal' },
      { characterId: 'c1', period: '2026-10', bossKey: 'blackmage:hard' },
    ]),
  );
  expect(goals).toHaveLength(3);
});

test('다시 저장하면 이번 기간 목표를 통째로 교체', async () => {
  const db = setup();
  await setGoals(db, 'c1', ['swoo:extreme', 'kaling:normal'], now);
  await setGoals(db, 'c1', ['seren:hard'], now);
  expect((await listGoals(db, ['2026-10-08'])).map((g) => g.bossKey)).toEqual(['seren:hard']);
});

test('같은 보스 두 난이도, 없는 보스는 거부', async () => {
  const db = setup();
  await expect(setGoals(db, 'c1', ['swoo:extreme', 'swoo:hard'], now)).rejects.toThrow('난이도 하나만');
  await expect(setGoals(db, 'c1', ['swoo:chaos'], now)).rejects.toThrow('알 수 없는 보스');
  await expect(setGoals(db, 'x', [], now)).rejects.toThrow('캐릭터가 없습니다');
});

test('지난주 주간 목표 복사, 이번 달 월간 목표는 유지', async () => {
  const db = setup();
  await setGoals(db, 'c1', ['swoo:extreme', 'blackmage:hard'], now);
  const copied = await copyLastWeek(db, 'c1', nextWeek);
  expect(copied).toEqual(
    expect.arrayContaining([
      { characterId: 'c1', period: '2026-10-15', bossKey: 'swoo:extreme' },
      { characterId: 'c1', period: '2026-10', bossKey: 'blackmage:hard' },
    ]),
  );
  await expect(copyLastWeek(db, 'c1', nextWeek)).rejects.toThrow('이미 있습니다');
});

test('지난주 목표가 없으면 복사 불가', async () => {
  await expect(copyLastWeek(setup(), 'c1', now)).rejects.toThrow('지난주 목표가 없습니다');
});
