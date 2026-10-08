// 내 캐릭터 현황판: 캐릭터 × 보스 칸마다 상태
// goal = 목표만, party = 파티 확정(시간 포함), cleared = 클리어

export const CELL = { GOAL: 'goal', PARTY: 'party', CLEARED: 'cleared' };

/**
 * @param {object[]} chars 내 캐릭터
 * @param {object[]} goals { characterId, bossKey }
 * @param {object[]} courses { id, startAt, status, steps: [{ bossKey, cleared }], characterIds }
 * @returns {{ bossKeys: string[], cells: Record<string, Record<string, { state, course? }>> }}
 *   cells[characterId][bossKey]
 */
export function buildBoard(chars, goals, courses) {
  const ids = new Set(chars.map((c) => c.id));
  const cells = Object.fromEntries(chars.map((c) => [c.id, {}]));
  const order = [];
  const addKey = (k) => {
    if (!order.includes(k)) order.push(k);
  };

  for (const g of goals) {
    if (!ids.has(g.characterId)) continue;
    addKey(g.bossKey);
    cells[g.characterId][g.bossKey] = { state: CELL.GOAL };
  }
  for (const course of courses) {
    if (course.status === 'canceled') continue;
    for (const cid of course.characterIds) {
      if (!ids.has(cid)) continue;
      for (const s of course.steps) {
        addKey(s.bossKey);
        cells[cid][s.bossKey] = { state: s.cleared ? CELL.CLEARED : CELL.PARTY, course };
      }
    }
  }
  return { bossKeys: order, cells };
}

// 캐릭터별 남은(목표만 있고 파티 미정) 보스 수
export function pendingCount(board, characterId) {
  return Object.values(board.cells[characterId] || {}).filter((c) => c.state === CELL.GOAL).length;
}
