import { dayTimeToIso, rangeToSlotKeys, rangesToSlots, slotsToRanges } from '@/lib/hopeTime';

describe('hopeTime', () => {
  test('시작~끝을 1시간 칸으로', () => {
    expect(rangeToSlotKeys({ day: 0, from: '21:00', to: '23:00' })).toEqual(['0-21', '0-22']);
  });

  test('분 단위는 시작 내림, 끝 올림', () => {
    expect(rangeToSlotKeys({ day: 2, from: '20:30', to: '21:10' })).toEqual(['2-20', '2-21']);
  });

  test('자정 넘기면 다음 요일로', () => {
    expect(rangeToSlotKeys({ day: 1, from: '23:00', to: '01:00' })).toEqual(['1-23', '2-0']);
  });

  test('수요일 자정 넘김은 주차 밖이라 버림', () => {
    expect(rangeToSlotKeys({ day: 6, from: '23:00', to: '01:00' })).toEqual(['6-23']);
  });

  test('잘못된 값은 빈 목록', () => {
    expect(rangeToSlotKeys({ day: 0, from: '', to: '22:00' })).toEqual([]);
  });

  test('범위 여러 개 → slots, 다시 범위로', () => {
    const ranges = [
      { day: 0, from: '21:00', to: '23:00' },
      { day: 2, from: '20:00', to: '22:00' },
    ];
    const slots = rangesToSlots(ranges);
    expect(slots).toEqual({ '0-21': true, '0-22': true, '2-20': true, '2-21': true });
    expect(slotsToRanges(slots)).toEqual(ranges);
  });

  test('밤 12시까지는 끝 00:00', () => {
    expect(slotsToRanges({ '3-23': true })).toEqual([{ day: 3, from: '23:00', to: '00:00' }]);
  });

  test('요일+시각 → ISO (KST)', () => {
    expect(dayTimeToIso('2026-10-08', 2, '21:30')).toBe('2026-10-10T12:30:00.000Z');
  });
});
