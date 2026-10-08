import { buildBoard, CELL, pendingCount } from '@/lib/board';
import { conflictsByCourse, findTimeConflicts } from '@/lib/conflicts';

const chars = [
  { id: 'a1', memberId: 'm1', name: '본캐' },
  { id: 'a2', memberId: 'm1', name: '부캐' },
  { id: 'b1', memberId: 'm2', name: '친구' },
];
const course = (id, startAt, characterIds, steps, status = 'planned') => ({
  id,
  startAt,
  status,
  characterIds,
  steps: steps.map((k) => (typeof k === 'string' ? { bossKey: k, cleared: false } : k)),
});

describe('findTimeConflicts', () => {
  test('같은 사람 다른 캐릭이 2시간 안에 겹치면 잡음', () => {
    const cs = [course('c1', '2026-10-10T12:00:00Z', ['a1', 'b1'], ['swoo:extreme']), course('c2', '2026-10-10T13:00:00Z', ['a2', 'b1'], ['kaling:normal'])];
    const out = findTimeConflicts(cs, chars);
    expect(out).toHaveLength(1);
    expect(out[0].names).toEqual(['본캐', '부캐']);
    expect(Object.keys(conflictsByCourse(out)).sort()).toEqual(['c1', 'c2']);
  });

  test('같은 캐릭이 이어서 가는 건 괜찮음', () => {
    const cs = [course('c1', '2026-10-10T12:00:00Z', ['a1', 'b1'], ['swoo:extreme']), course('c2', '2026-10-10T12:00:00Z', ['a1'], ['kaling:normal'])];
    expect(findTimeConflicts(cs, chars)).toEqual([]);
  });

  test('2시간 이상 떨어지거나 취소·시간 미정이면 제외', () => {
    const cs = [
      course('c1', '2026-10-10T12:00:00Z', ['a1'], ['swoo:extreme']),
      course('c2', '2026-10-10T14:00:00Z', ['a2'], ['kaling:normal']),
      course('c3', '2026-10-10T12:30:00Z', ['a2'], ['kalos:normal'], 'canceled'),
      course('c4', null, ['a2'], ['limbo:normal']),
    ];
    expect(findTimeConflicts(cs, chars)).toEqual([]);
  });
});

describe('buildBoard', () => {
  test('목표·파티·클리어 상태', () => {
    const goals = [
      { characterId: 'a1', bossKey: 'swoo:extreme' },
      { characterId: 'a1', bossKey: 'kaling:normal' },
      { characterId: 'a2', bossKey: 'kaling:normal' },
      { characterId: 'b1', bossKey: 'swoo:extreme' },
    ];
    const cs = [
      course('c1', '2026-10-10T12:00:00Z', ['a1', 'b1'], ['swoo:extreme']),
      course('c2', '2026-10-10T12:00:00Z', ['a2'], [{ bossKey: 'kaling:normal', cleared: true }]),
    ];
    const board = buildBoard(chars.slice(0, 2), goals, cs);
    expect(board.bossKeys).toEqual(['swoo:extreme', 'kaling:normal']);
    expect(board.cells.a1['swoo:extreme'].state).toBe(CELL.PARTY);
    expect(board.cells.a1['kaling:normal'].state).toBe(CELL.GOAL);
    expect(board.cells.a2['kaling:normal'].state).toBe(CELL.CLEARED);
    expect(board.cells.b1).toBeUndefined();
    expect(pendingCount(board, 'a1')).toBe(1);
  });
});
