import { context, handle, readJson } from '@/lib/server';
import { removeCourse, updateCourse } from '@/lib/services/courses';

export const dynamic = 'force-dynamic';

export const PUT = handle(async (request, { params }) => {
  const body = await readJson(request);
  return { course: await updateCourse(context().db, params.id, body) };
});

export const DELETE = handle(async (_request, { params }) => {
  await removeCourse(context().db, params.id);
  return { ok: true };
});
