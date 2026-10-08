// 주간·월간 보스 목표 (M2)
// - 주간 보스는 주차 키(목요일 0시 KST 시작일), 월간 보스는 월 키로 저장 (lib/week.js)
// - 같은 기간에 같은 보스는 난이도 하나만 (주간 보스는 한 주에 한 난이도만 클리어 가능)
// - 행 id = `${character_id}:${period}:${boss_id}`

import { getBoss, isValidBossKey, parseBossKey } from '../bosses';
import { monthKey, periodOf, shiftWeek, weekKey } from '../week';
import { UserError } from './roster';

export function currentPeriods(now = new Date()) {
  return { week: weekKey(now), month: monthKey(now) };
}

export function toGoal(row) {
  return { characterId: row.character_id, period: row.period, bossKey: row.boss_key };
}

export async function listGoals(db, periods) {
  const want = new Set(periods);
  const rows = await db.list('goals');
  return rows.filter((r) => want.has(r.period)).map(toGoal);
}

function validate(bossKeys) {
  const seen = new Set();
  for (const key of bossKeys) {
    if (!isValidBossKey(key)) throw new UserError(`알 수 없는 보스: ${key}`);
    const { bossId } = parseBossKey(key);
    if (seen.has(bossId)) throw new UserError(`${getBoss(bossId).name}은(는) 한 기간에 난이도 하나만 고를 수 있습니다.`);
    seen.add(bossId);
  }
}

/**
 * 이번 주·이번 달 목표를 bossKeys로 통째로 바꾼다 (주간/월간은 보스 주기로 나눠 저장)
 */
export async function setGoals(db, characterId, bossKeys, now = new Date()) {
  const chars = await db.list('characters');
  if (!chars.some((c) => c.id === characterId)) throw new UserError('캐릭터가 없습니다.', 404);
  const keys = [...new Set(bossKeys || [])];
  validate(keys);

  const { week, month } = currentPeriods(now);
  const rows = await db.list('goals');
  for (const r of rows) {
    if (r.character_id === characterId && (r.period === week || r.period === month)) await db.remove('goals', r.id);
  }
  for (const key of keys) {
    const { bossId } = parseBossKey(key);
    const period = periodOf(now, getBoss(bossId).cycle);
    await db.insert('goals', { id: `${characterId}:${period}:${bossId}`, character_id: characterId, period, boss_key: key });
  }
  return listGoals(db, [week, month]).then((gs) => gs.filter((g) => g.characterId === characterId));
}

// 지난주 주간 목표를 이번 주로 복사 (이번 주 주간 목표가 이미 있으면 거부)
export async function copyLastWeek(db, characterId, now = new Date()) {
  const { week, month } = currentPeriods(now);
  const last = shiftWeek(week, -1);
  const rows = await db.list('goals');
  const mine = rows.filter((r) => r.character_id === characterId);
  if (mine.some((r) => r.period === week)) throw new UserError('이번 주 목표가 이미 있습니다.', 409);
  const prev = mine.filter((r) => r.period === last).map((r) => r.boss_key);
  if (!prev.length) throw new UserError('지난주 목표가 없습니다.', 404);
  const monthly = mine.filter((r) => r.period === month).map((r) => r.boss_key);
  return setGoals(db, characterId, [...prev, ...monthly], now);
}
