// 주차별 가능 시간 (M4). 행 id = `${member_id}:${week_start}`

import { cleanSlots } from '../slots';
import { shiftWeek, weekKey } from '../week';
import { UserError } from './roster';

export function toAvailability(row) {
  return { memberId: row.member_id, week: row.week_start, slots: row.slots || {}, memo: row.memo || '' };
}

export async function listAvailability(db, week = weekKey()) {
  const rows = await db.list('availability');
  return rows.filter((r) => r.week_start === week).map(toAvailability);
}

export async function setAvailability(db, memberId, week, { slots, memo } = {}) {
  const members = await db.list('members');
  if (!members.some((m) => m.id === memberId)) throw new UserError('먼저 내 이름을 선택해 주세요.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(week))) throw new UserError('주차 형식이 잘못되었습니다.');
  const id = `${memberId}:${week}`;
  const row = { id, member_id: memberId, week_start: week, slots: cleanSlots(slots), memo: String(memo || '').slice(0, 100) };
  const rows = await db.list('availability');
  if (rows.some((r) => r.id === id)) await db.update('availability', id, row);
  else await db.insert('availability', row);
  return toAvailability(row);
}

// 지난주 가능 시간을 그대로 가져오기
export async function copyLastWeekAvailability(db, memberId, week) {
  const rows = await db.list('availability');
  const prev = rows.find((r) => r.id === `${memberId}:${shiftWeek(week, -1)}`);
  if (!prev || !Object.keys(prev.slots || {}).length) throw new UserError('지난주 가능 시간이 없습니다.', 404);
  return setAvailability(db, memberId, week, { slots: prev.slots, memo: prev.memo });
}
