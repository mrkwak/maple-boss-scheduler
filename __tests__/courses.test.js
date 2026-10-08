import { createMemoryAdapter } from '@/lib/db/memory';
import { createCourse, listCourses, updateCourse, removeCourse } from '@/lib/services/courses';

const now = new Date('2026-10-09T03:00:00Z'); // 주차 2026-10-08

function setup() {
  return createMemoryAdapter({
    characters: [
      { id: 'j', member_id: 'm1', name: '집사0', level: 291 },
      { id: 'r', member_id: 'm2', name: '렌선남아', level: 294 },
      { id: 'j2', member_id: 'm1', name: '집사부캐', level: 280 },
    ],
  });
}

const base = { stepKeys: ['swoo:extreme', 'hyungseong:normal', 'kaling:normal'], characterIds: ['j', 'r'], startAt: '2026-10-10T12:00:00Z', title: '목요일 코스' };

test('코스 생성·조회: 보스 순서와 캐릭터 유지', async () => {
  const db = setup();
  const c = await createCourse(db, base, { memberId: 'm1', now });
  expect(c).toMatchObject({ weekStart: '2026-10-08', title: '목요일 코스', characterIds: ['j', 'r'], status: 'planned' });
  expect(c.steps.map((s) => s.bossKey)).toEqual(base.stepKeys);
  expect(await listCourses(db, '2026-10-08')).toHaveLength(1);
});

test('같은 사람 캐릭 2개, 레벨 부족, 같은 주 같은 보스 중복은 거부', async () => {
  const db = setup();
  await expect(createCourse(db, { ...base, characterIds: ['j', 'j2'] }, { now })).rejects.toThrow('같은 사람');
  await expect(createCourse(db, { ...base, stepKeys: ['jupiter:normal'] }, { now })).rejects.toThrow('입장 불가');
  await createCourse(db, base, { now });
  await expect(createCourse(db, { ...base, stepKeys: ['swoo:extreme'], characterIds: ['r'] }, { now })).rejects.toThrow('이미 다른 코스');
});

test('입력 검사', async () => {
  const db = setup();
  await expect(createCourse(db, { ...base, stepKeys: [] }, { now })).rejects.toThrow('보스를');
  await expect(createCourse(db, { ...base, characterIds: [] }, { now })).rejects.toThrow('캐릭터를');
  await expect(createCourse(db, { ...base, stepKeys: ['swoo:extreme', 'swoo:extreme'] }, { now })).rejects.toThrow('두 번');
  await expect(createCourse(db, { ...base, startAt: 'abc' }, { now })).rejects.toThrow('시간');
});

test('수정: 자기 코스와는 중복 아님, 클리어 표시는 남은 보스에 유지', async () => {
  const db = setup();
  const c = await createCourse(db, base, { now });
  await db.update('course_steps', c.steps[0].id, { cleared: true });
  const u = await updateCourse(db, c.id, { stepKeys: ['swoo:extreme', 'seren:hard'], startAt: '2026-10-11T12:00:00Z' });
  expect(u.steps).toEqual([
    expect.objectContaining({ bossKey: 'swoo:extreme', cleared: true }),
    expect.objectContaining({ bossKey: 'seren:hard', cleared: false }),
  ]);
  expect(u.startAt).toBe('2026-10-11T12:00:00.000Z');
});

test('삭제하면 보스·멤버도 지움, 취소된 코스는 중복 검사에서 제외', async () => {
  const db = setup();
  const c = await createCourse(db, base, { now });
  await updateCourse(db, c.id, { status: 'canceled' });
  await createCourse(db, { ...base, characterIds: ['r'] }, { now });
  await removeCourse(db, c.id);
  expect(await db.list('course_steps')).toHaveLength(3);
  expect(await db.list('course_members')).toHaveLength(1);
});
