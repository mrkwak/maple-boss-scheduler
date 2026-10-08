import { weekKey, monthKey, periodOf, shiftWeek, weekStartAt } from '@/lib/week';

// KST = UTC+9
const kst = (s) => new Date(`${s}+09:00`);

describe('weekKey (목요일 0시 KST 기준)', () => {
  test('목요일 0시 정각은 새 주차', () => {
    expect(weekKey(kst('2026-10-08T00:00:00'))).toBe('2026-10-08');
  });
  test('수요일 23:59는 지난 주차', () => {
    expect(weekKey(kst('2026-10-07T23:59:59'))).toBe('2026-10-01');
  });
  test('일요일은 그 주 목요일', () => {
    expect(weekKey(kst('2026-10-11T12:00:00'))).toBe('2026-10-08');
  });
  test('UTC로는 수요일이어도 KST 목요일이면 새 주차', () => {
    expect(weekKey(new Date('2026-10-07T15:30:00Z'))).toBe('2026-10-08');
  });
  test('weekStartAt은 KST 목 0시 = UTC 수 15시', () => {
    expect(weekStartAt(kst('2026-10-10T10:00:00')).toISOString()).toBe('2026-10-07T15:00:00.000Z');
  });
});

describe('monthKey / periodOf', () => {
  test('KST 기준 월', () => {
    expect(monthKey(new Date('2026-10-31T15:00:00Z'))).toBe('2026-11');
    expect(monthKey(new Date('2026-10-31T14:59:59Z'))).toBe('2026-10');
  });
  test('주기별 기간 키', () => {
    const d = kst('2026-10-09T09:00:00');
    expect(periodOf(d, 'weekly')).toBe('2026-10-08');
    expect(periodOf(d, 'monthly')).toBe('2026-10');
  });
  test('shiftWeek', () => {
    expect(shiftWeek('2026-10-08', 1)).toBe('2026-10-15');
    expect(shiftWeek('2026-10-01', -1)).toBe('2026-09-24');
  });
});
