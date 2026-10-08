import { context, handle, readJson } from '@/lib/server';
import { setGoals } from '@/lib/services/goals';

export const dynamic = 'force-dynamic';

// 이번 주·이번 달 목표를 통째로 저장 { bossKeys: ['swoo:extreme', ...] }
export const PUT = handle(async (request, { params }) => {
  const { bossKeys } = await readJson(request);
  return { goals: await setGoals(context().db, params.characterId, Array.isArray(bossKeys) ? bossKeys : []) };
});
