import { context, handle, readJson } from '@/lib/server';
import { isValidBossKey } from '@/lib/bosses';
import { UserError } from '@/lib/services/roster';

export const dynamic = 'force-dynamic';

const toCut = (r) => ({ bossKey: r.boss_key, baseSpec: r.base_spec, source: r.source, verifiedAt: r.verified_at });

// 보스별 100% 기준 헥사환산 (boss_cuts 테이블, ADR-0009)
export const GET = handle(async () => {
  const rows = await context().db.list('boss_cuts');
  return { cuts: rows.filter((r) => isValidBossKey(r.boss_key) && r.base_spec > 0).map(toCut) };
});

// 기준값 넣기·고치기. body: { cuts: [{ bossKey, baseSpec, note?, source?, verifiedAt? }] }
export const PUT = handle(async (request) => {
  const { cuts } = await readJson(request);
  if (!Array.isArray(cuts) || !cuts.length) throw new UserError('cuts 목록이 필요합니다.');
  for (const c of cuts) {
    if (!isValidBossKey(c.bossKey)) throw new UserError(`알 수 없는 보스: ${c.bossKey}`);
    if (!(Number(c.baseSpec) > 0)) throw new UserError(`기준값이 잘못되었습니다: ${c.bossKey}`);
  }
  const { db } = context();
  const existing = new Set((await db.list('boss_cuts')).map((r) => r.id));
  for (const c of cuts) {
    const row = {
      id: c.bossKey,
      boss_key: c.bossKey,
      base_spec: Number(c.baseSpec),
      note: String(c.note || ''),
      source: String(c.source || ''),
      verified_at: String(c.verifiedAt || ''),
    };
    if (existing.has(row.id)) await db.update('boss_cuts', row.id, row);
    else await db.insert('boss_cuts', row);
  }
  return { saved: cuts.length };
});
