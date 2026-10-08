import { slotToIso, dayLabel, cleanSlots, heat, commonSlots, toRanges } from '@/lib/slots';
import { createMemoryAdapter } from '@/lib/db/memory';
import { setAvailability, listAvailability, copyLastWeekAvailability } from '@/lib/services/availability';

test('칸 → KST 시각', () => {
  // 주차 2026-10-08(목) + 2일 21시 = 10/10(토) 21:00 KST = 12:00Z
  expect(slotToIso('2026-10-08', '2-21')).toBe('2026-10-10T12:00:00.000Z');
  expect(dayLabel('2026-10-08', 0)).toBe('10/8(목)');
  expect(dayLabel('2026-10-08', 6)).toBe('10/14(수)');
});

test('잘못된 칸은 버림', () => {
  expect(cleanSlots({ '0-21': true, '7-1': true, '1-24': true, x: true, '2-3': false })).toEqual({ '0-21': true });
});

test('겹치는 칸과 연속 구간', () => {
  const a = { '0-20': true, '0-21': true, '0-22': true, '2-21': true };
  const b = { '0-21': true, '0-22': true, '2-21': true, '3-1': true };
  expect(heat([a, b])['0-21']).toBe(2);
  const common = commonSlots([a, b]);
  expect(common).toEqual(['0-21', '0-22', '2-21']);
  expect(toRanges(common)).toEqual([
    { day: 0, from: 21, to: 23 },
    { day: 2, from: 21, to: 22 },
  ]);
  expect(commonSlots([])).toEqual([]);
});

test('주차별 저장·덮어쓰기·지난주 복사', async () => {
  const db = createMemoryAdapter({ members: [{ id: 'm1', name: 'A' }] });
  await setAvailability(db, 'm1', '2026-10-01', { slots: { '0-21': true } });
  await setAvailability(db, 'm1', '2026-10-01', { slots: { '1-22': true } });
  expect((await listAvailability(db, '2026-10-01'))[0].slots).toEqual({ '1-22': true });
  const copied = await copyLastWeekAvailability(db, 'm1', '2026-10-08');
  expect(copied).toMatchObject({ week: '2026-10-08', slots: { '1-22': true } });
  await expect(copyLastWeekAvailability(db, 'm1', '2026-10-22')).rejects.toThrow('지난주');
  await expect(setAvailability(db, 'x', '2026-10-08', {})).rejects.toThrow('이름');
});
