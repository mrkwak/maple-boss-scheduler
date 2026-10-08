import { context, handle } from '@/lib/server';
import { isValidBossKey } from '@/lib/bosses';

export const dynamic = 'force-dynamic';

// 보스별 100% 기준 헥사환산 (시트 boss_cuts 탭, ADR-0009)
export const GET = handle(async () => {
  const rows = await context().db.list('boss_cuts');
  return {
    cuts: rows
      .filter((r) => isValidBossKey(r.boss_key) && r.base_spec > 0)
      .map((r) => ({ bossKey: r.boss_key, baseSpec: r.base_spec, source: r.source, verifiedAt: r.verified_at })),
  };
});
