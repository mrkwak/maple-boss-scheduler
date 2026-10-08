import { context, handle, readJson } from '@/lib/server';
import { setCleared } from '@/lib/services/courses';

export const dynamic = 'force-dynamic';

// 보스 클리어 표시. { bossKey, cleared }
export const PATCH = handle(async (request, { params }) => {
  const { bossKey, cleared } = await readJson(request);
  return { course: await setCleared(context().db, params.id, bossKey, cleared) };
});
