import { context, handle, readJson } from '@/lib/server';
import { removeCharacter, updateSpec } from '@/lib/services/roster';

export const dynamic = 'force-dynamic';

// 헥사 환산·보스 배율 수동 입력
export const PATCH = handle(async (request, { params }) => {
  const body = await readJson(request);
  return { character: await updateSpec(context().db, params.id, body) };
});

export const DELETE = handle(async (_request, { params }) => {
  await removeCharacter(context().db, params.id);
  return { ok: true };
});
