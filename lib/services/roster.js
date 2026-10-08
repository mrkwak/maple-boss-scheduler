// 멤버·캐릭터 등록 (M1)
// db: lib/db 어댑터, nexon: lib/nexon 클라이언트(키 없으면 null), provider: lib/spec/provider 공급자

import { newId } from '../db';
import { normalizeManualSpec, SpecProviderNotReady, maplescouterUrl } from '../spec/provider';
import { NEXON_ERROR } from '../nexon';

export class UserError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'UserError';
    this.status = status;
  }
}

const NAME_MAX = 20;
export const STALE_DAYS = 14;

function cleanName(name, label) {
  const v = String(name ?? '').trim();
  if (!v) throw new UserError(`${label}을(를) 입력해 주세요.`);
  if (v.length > NAME_MAX) throw new UserError(`${label}은(는) ${NAME_MAX}자 이하로 입력해 주세요.`);
  return v;
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// ---- 멤버 ----

export function toMember(row) {
  return { id: row.id, name: row.name, memo: row.memo || '' };
}

export async function listMembers(db) {
  const rows = await db.list('members');
  return rows.map(toMember).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export async function createMember(db, { name }, now = new Date()) {
  const clean = cleanName(name, '이름');
  const rows = await db.list('members');
  if (rows.some((r) => sameName(r.name, clean))) throw new UserError('이미 있는 이름입니다.', 409);
  const row = { id: newId(), name: clean, memo: '', created_at: now.toISOString() };
  await db.insert('members', row);
  return toMember(row);
}

// ---- 캐릭터 ----

export function toCharacter(row, now = new Date()) {
  const updatedAt = row.spec_updated_at || null;
  const stale =
    !!updatedAt && now.getTime() - new Date(updatedAt).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000;
  return {
    id: row.id,
    memberId: row.member_id,
    ocid: row.ocid || null,
    name: row.name,
    world: row.world || null,
    className: row.class || null,
    level: row.level ?? null,
    combatPower: row.combat_power ?? null,
    apiStats: row.api_stats || null,
    basicUpdatedAt: row.basic_updated_at || null,
    hexaSpec: row.hexa_spec ?? null,
    bossRates: row.boss_rates || {},
    specSource: row.spec_source || null,
    specUpdatedAt: updatedAt,
    specStale: stale,
    sourceUrl: maplescouterUrl(row.name),
  };
}

export async function listCharacters(db, now = new Date()) {
  const rows = await db.list('characters');
  return rows.map((r) => toCharacter(r, now));
}

/**
 * 캐릭터 등록: 넥슨 API로 ocid·기본정보, 공급자가 조회 가능하면 헥사 환산·배율 1회 조회.
 * 넥슨 키가 없으면 닉네임만으로 등록(개발용).
 */
export async function registerCharacter({ db, nexon, provider }, { memberId, name }, now = new Date()) {
  const clean = cleanName(name, '닉네임');
  const members = await db.list('members');
  if (!members.some((m) => m.id === memberId)) throw new UserError('먼저 내 이름을 선택해 주세요.');

  const existing = await db.list('characters');
  if (existing.some((c) => sameName(c.name, clean))) throw new UserError('이미 등록된 캐릭터입니다.', 409);

  const row = {
    id: newId(),
    member_id: memberId,
    ocid: '',
    name: clean,
    world: '',
    class: '',
    level: null,
    hexa_spec: null,
    boss_rates: {},
    spec_source: '',
    spec_updated_at: '',
    combat_power: null,
    api_stats: null,
    basic_updated_at: '',
    created_at: now.toISOString(),
  };

  if (nexon) {
    const ocid = await nexon.getOcid(clean).catch((e) => {
      if (e.code === NEXON_ERROR.INVALID_PARAMETER) return null;
      if (e.code === NEXON_ERROR.INVALID_KEY) throw new UserError('넥슨 API 키가 올바르지 않습니다. 관리자에게 알려주세요.', 502);
      throw e;
    });
    if (!ocid) throw new UserError('캐릭터를 찾을 수 없습니다. 닉네임을 확인해 주세요.', 404);
    if (existing.some((c) => c.ocid && c.ocid === ocid)) throw new UserError('이미 등록된 캐릭터입니다.', 409);
    Object.assign(row, { ocid }, await fetchBasic(nexon, ocid, clean, now));
  }

  const warnings = [];
  if (!nexon) warnings.push('넥슨 API 키가 없어 기본정보 없이 등록했습니다.');

  if (provider?.canFetch) {
    try {
      const spec = await provider.fetchSpec(row.name);
      Object.assign(row, {
        hexa_spec: spec.hexaSpec ?? null,
        boss_rates: spec.bossRates || {},
        spec_source: provider.id,
        spec_updated_at: (spec.fetchedAt || now).toISOString(),
      });
    } catch (e) {
      if (!(e instanceof SpecProviderNotReady)) warnings.push('환산 조회에 실패했습니다. 직접 입력해 주세요.');
    }
  }

  await db.insert('characters', row);
  return { character: toCharacter(row, now), warnings };
}

export async function updateSpec(db, id, input, now = new Date()) {
  const rows = await db.list('characters');
  if (!rows.some((r) => r.id === id)) throw new UserError('캐릭터가 없습니다.', 404);
  let spec;
  try {
    spec = normalizeManualSpec(input);
  } catch (e) {
    throw new UserError(e.message);
  }
  const row = await db.update('characters', id, {
    hexa_spec: spec.hexaSpec,
    boss_rates: spec.bossRates,
    spec_source: 'manual',
    spec_updated_at: now.toISOString(),
  });
  return toCharacter(row, now);
}

// 넥슨 API 기본정보 + 스탯. 스탯 조회 실패는 무시(배율 추정에만 쓰는 값)
async function fetchBasic(nexon, ocid, fallbackName, now) {
  const basic = await nexon.getBasic(ocid);
  const stats = await nexon.getStats(ocid).catch(() => null);
  return {
    name: basic.name || fallbackName,
    world: basic.world || '',
    class: basic.className || '',
    level: basic.level ?? null,
    combat_power: stats?.combatPower ?? null,
    api_stats: stats,
    basic_updated_at: now.toISOString(),
  };
}

// 닉네임·레벨·전투력 다시 가져오기 (ocid 기준이라 닉네임이 바뀌어도 됨)
export async function refreshBasic({ db, nexon }, id, now = new Date()) {
  if (!nexon) throw new UserError('넥슨 API 키가 설정되지 않았습니다.', 503);
  const rows = await db.list('characters');
  const row = rows.find((r) => r.id === id);
  if (!row) throw new UserError('캐릭터가 없습니다.', 404);
  if (!row.ocid) throw new UserError('넥슨 API로 등록되지 않은 캐릭터입니다. 삭제 후 다시 등록해 주세요.');
  const updated = await db.update('characters', id, await fetchBasic(nexon, row.ocid, row.name, now));
  return toCharacter(updated, now);
}

// 캐릭터 삭제 시 목표·코스 배정도 함께 지운다
export async function removeCharacter(db, id) {
  for (const table of ['goals', 'course_members']) {
    const rows = await db.list(table);
    for (const r of rows.filter((x) => x.character_id === id)) await db.remove(table, r.id);
  }
  await db.remove('characters', id);
}
