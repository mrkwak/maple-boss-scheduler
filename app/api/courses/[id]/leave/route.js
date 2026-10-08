import { context, handle, readJson } from '@/lib/server';
import { leaveCourse } from '@/lib/services/courses';

export const dynamic = 'force-dynamic';

// 파티에서 빠지기. { characterId } — 마지막 사람이면 파티 삭제
export const POST = handle(async (request, { params }) => {
  const { characterId } = await readJson(request);
  return { course: await leaveCourse(context().db, params.id, characterId) };
});
