import { context, handle, readJson } from '@/lib/server';
import { joinCourse } from '@/lib/services/courses';

export const dynamic = 'force-dynamic';

// 모집 중 파티에 합류. { characterId }
export const POST = handle(async (request, { params }) => {
  const { characterId } = await readJson(request);
  return { course: await joinCourse(context().db, params.id, characterId) };
});
