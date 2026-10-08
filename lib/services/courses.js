// 보스 코스 = 어떤 보스(순서)를, 어떤 캐릭터들과, 언제 (M3, ADR-0004)
// 파티 배율은 저장하지 않고 화면에서 매번 계산 → 환산이 갱신되면 코스 배율도 바로 바뀜

import { isValidBossKey } from '../bosses';
import { newId } from '../db';
import { validateCourse } from '../rules';
import { weekKey } from '../week';
import { UserError, toCharacter } from './roster';

const STATUS = ['planned', 'done', 'canceled'];
export const PARTY_SIZES = [2, 3, 4, 5, 6]; // 보스별 실제 최대 인원은 미확인 → 일괄 6

function toCourse(row, steps, members) {
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title || '',
    startAt: row.start_at || null,
    memo: row.memo || '',
    status: row.status || 'planned',
    createdBy: row.created_by || null,
    partySize: Number(row.party_size) || null,
    steps: steps
      .filter((s) => s.course_id === row.id)
      .sort((a, b) => a.step_index - b.step_index)
      .map((s) => ({ id: s.id, bossKey: s.boss_key, cleared: !!s.cleared })),
    characterIds: members.filter((m) => m.course_id === row.id).map((m) => m.character_id),
  };
}

export async function listCourses(db, week = weekKey()) {
  const [rows, steps, members] = await Promise.all([db.list('courses'), db.list('course_steps'), db.list('course_members')]);
  return rows
    .filter((r) => r.week_start === week)
    .map((r) => toCourse(r, steps, members))
    .sort((a, b) => String(a.startAt || '9').localeCompare(String(b.startAt || '9')));
}

// 같은 주 다른 코스에 이미 배정된 보스 (캐릭터별)
async function assignedElsewhere(db, week, exceptCourseId) {
  const courses = await listCourses(db, week);
  const map = {};
  for (const c of courses) {
    if (c.id === exceptCourseId || c.status === 'canceled') continue;
    for (const id of c.characterIds) (map[id] ||= []).push(...c.steps.map((s) => s.bossKey));
  }
  return map;
}

function cleanInput(input) {
  const stepKeys = (input.stepKeys || []).filter(Boolean);
  const characterIds = [...new Set((input.characterIds || []).filter(Boolean))];
  if (!stepKeys.length) throw new UserError('보스를 하나 이상 넣어 주세요.');
  if (new Set(stepKeys).size !== stepKeys.length) throw new UserError('같은 보스가 두 번 들어 있습니다.');
  for (const k of stepKeys) if (!isValidBossKey(k)) throw new UserError(`알 수 없는 보스: ${k}`);
  if (!characterIds.length) throw new UserError('캐릭터를 한 명 이상 넣어 주세요.');
  if (input.startAt && Number.isNaN(new Date(input.startAt).getTime())) throw new UserError('시간 형식이 잘못되었습니다.');
  if (input.status && !STATUS.includes(input.status)) throw new UserError('상태 값이 잘못되었습니다.');
  const partySize = input.partySize == null || input.partySize === '' ? null : Number(input.partySize);
  if (partySize != null && !PARTY_SIZES.includes(partySize)) throw new UserError('인원은 2~6명 중에서 골라 주세요.');
  if (partySize != null && characterIds.length > partySize) throw new UserError(`${partySize}인 파티가 이미 다 찼습니다.`);
  return {
    partySize,
    stepKeys,
    characterIds,
    title: String(input.title || '').trim().slice(0, 40),
    startAt: input.startAt ? new Date(input.startAt).toISOString() : '',
    memo: String(input.memo || '').trim().slice(0, 200),
    status: input.status || 'planned',
  };
}

async function check(db, data, week, exceptCourseId) {
  const rows = await db.list('characters');
  const members = data.characterIds.map((id) => {
    const r = rows.find((x) => x.id === id);
    if (!r) throw new UserError('없는 캐릭터가 들어 있습니다.', 404);
    return toCharacter(r);
  });
  const errors = validateCourse({ members, stepKeys: data.stepKeys, assignedByCharacter: await assignedElsewhere(db, week, exceptCourseId) });
  if (errors.length) throw new UserError(errors.map((e) => e.message).join(' '));
}

async function writeParts(db, courseId, data, oldSteps = []) {
  const steps = await db.list('course_steps');
  const members = await db.list('course_members');
  const cleared = new Map(oldSteps.map((s) => [s.bossKey, s.cleared]));
  for (const s of steps.filter((x) => x.course_id === courseId)) await db.remove('course_steps', s.id);
  for (const m of members.filter((x) => x.course_id === courseId)) await db.remove('course_members', m.id);
  for (const [i, key] of data.stepKeys.entries()) {
    await db.insert('course_steps', { id: newId(), course_id: courseId, step_index: i, boss_key: key, cleared: !!cleared.get(key) });
  }
  for (const cid of data.characterIds) {
    await db.insert('course_members', { id: `${courseId}:${cid}`, course_id: courseId, character_id: cid });
  }
}

export async function createCourse(db, input, { memberId, now = new Date() } = {}) {
  const data = cleanInput(input);
  const week = weekKey(now);
  await check(db, data, week);
  const id = newId();
  await db.insert('courses', {
    id,
    week_start: week,
    title: data.title,
    start_at: data.startAt,
    memo: data.memo,
    status: data.status,
    created_by: memberId || '',
    created_at: now.toISOString(),
    party_size: data.partySize,
  });
  await writeParts(db, id, data);
  return (await listCourses(db, week)).find((c) => c.id === id);
}

export async function updateCourse(db, id, input) {
  const rows = await db.list('courses');
  const row = rows.find((r) => r.id === id);
  if (!row) throw new UserError('코스가 없습니다.', 404);
  const before = (await listCourses(db, row.week_start)).find((c) => c.id === id);
  // 일부만 바꿔도 되도록 기존 값 위에 덮어쓴다
  const current = { ...before, stepKeys: before.steps.map((s) => s.bossKey) };
  const data = cleanInput({ ...current, ...input });
  await check(db, data, row.week_start, id);
  await db.update('courses', id, { title: data.title, start_at: data.startAt, memo: data.memo, status: data.status, party_size: data.partySize });
  await writeParts(db, id, data, before.steps);
  return (await listCourses(db, row.week_start)).find((c) => c.id === id);
}

export async function removeCourse(db, id) {
  for (const table of ['course_steps', 'course_members']) {
    const rows = await db.list(table);
    for (const r of rows.filter((x) => x.course_id === id)) await db.remove(table, r.id);
  }
  await db.remove('courses', id);
}

// ── 모집 파티 (ADR-0013) ──

async function getCourse(db, id) {
  const row = (await db.list('courses')).find((r) => r.id === id);
  if (!row) throw new UserError('파티가 없습니다.', 404);
  return (await listCourses(db, row.week_start)).find((c) => c.id === id);
}

// 모집 중 파티에 합류. 인원·같은 사람·레벨·중복은 updateCourse 검사 그대로
export async function joinCourse(db, id, characterId) {
  const course = await getCourse(db, id);
  if (course.characterIds.includes(characterId)) return course;
  if (!course.partySize || course.characterIds.length >= course.partySize) throw new UserError('이미 다 찬 파티입니다.', 409);
  return updateCourse(db, id, { characterIds: [...course.characterIds, characterId] });
}

// 파티에서 빠지기. 마지막 사람이 빠지면 파티 삭제 → null
export async function leaveCourse(db, id, characterId) {
  const course = await getCourse(db, id);
  const rest = course.characterIds.filter((x) => x !== characterId);
  if (!rest.length) {
    await removeCourse(db, id);
    return null;
  }
  return updateCourse(db, id, { characterIds: rest });
}

// 보스 클리어 표시 켜기/끄기
export async function setCleared(db, id, bossKey, cleared) {
  await getCourse(db, id);
  const step = (await db.list('course_steps')).find((s) => s.course_id === id && s.boss_key === bossKey);
  if (!step) throw new UserError('이 파티에 없는 보스입니다.', 404);
  await db.update('course_steps', step.id, { cleared: !!cleared });
  return getCourse(db, id);
}
