import { createMemoryAdapter } from '@/lib/db/memory';
import { createCourse, joinCourse, leaveCourse, listCourses, setCleared, updateCourse } from '@/lib/services/courses';

const now = new Date('2026-10-09T03:00:00Z'); // 주차 2026-10-08

function setup() {
  return createMemoryAdapter({
    characters: [
      { id: 'a', member_id: 'm1', name: 'A', level: 290 },
      { id: 'a2', member_id: 'm1', name: 'A부캐', level: 290 },
      { id: 'b', member_id: 'm2', name: 'B', level: 290 },
      { id: 'c', member_id: 'm3', name: 'C', level: 290 },
    ],
  });
}

const recruit = (db, size = 3) => createCourse(db, { stepKeys: ['kaling:normal'], characterIds: ['a'], partySize: size }, { now });

test('모집 파티 생성: 목표 인원 저장, 시간 없음', async () => {
  const db = setup();
  const c = await recruit(db);
  expect(c).toMatchObject({ partySize: 3, characterIds: ['a'], startAt: null });
});

test('인원 검사: 2~6, 목표보다 많으면 거부', async () => {
  const db = setup();
  await expect(createCourse(db, { stepKeys: ['kaling:normal'], characterIds: ['a'], partySize: 7 }, { now })).rejects.toThrow('2~6');
  await expect(createCourse(db, { stepKeys: ['kaling:normal'], characterIds: ['a', 'b', 'c'], partySize: 2 }, { now })).rejects.toThrow('다 찼');
});

test('합류: 다 차면 더 못 들어감, 같은 사람 캐릭은 거부', async () => {
  const db = setup();
  const c = await recruit(db, 3);
  await expect(joinCourse(db, c.id, 'a2')).rejects.toThrow('같은 사람');
  await joinCourse(db, c.id, 'b');
  const full = await joinCourse(db, c.id, 'c');
  expect(full.characterIds).toEqual(['a', 'b', 'c']);
  await expect(joinCourse(db, c.id, 'a2')).rejects.toThrow('다 찬');
});

test('빠지기: 남으면 유지, 마지막이면 삭제', async () => {
  const db = setup();
  const c = await recruit(db);
  await joinCourse(db, c.id, 'b');
  expect((await leaveCourse(db, c.id, 'a')).characterIds).toEqual(['b']);
  expect(await leaveCourse(db, c.id, 'b')).toBeNull();
  expect(await listCourses(db, '2026-10-08')).toHaveLength(0);
});

test('이 인원으로 확정: 목표 인원을 지금 인원으로 줄이고 시간 지정', async () => {
  const db = setup();
  const c = await recruit(db, 4);
  await joinCourse(db, c.id, 'b');
  const u = await updateCourse(db, c.id, { partySize: 2, startAt: '2026-10-10T12:00:00Z' });
  expect(u).toMatchObject({ partySize: 2, startAt: '2026-10-10T12:00:00.000Z' });
});

test('클리어 켜기/끄기, 없는 보스는 거부', async () => {
  const db = setup();
  const c = await recruit(db);
  expect((await setCleared(db, c.id, 'kaling:normal', true)).steps[0].cleared).toBe(true);
  expect((await setCleared(db, c.id, 'kaling:normal', false)).steps[0].cleared).toBe(false);
  await expect(setCleared(db, c.id, 'swoo:extreme', true)).rejects.toThrow('없는 보스');
});
