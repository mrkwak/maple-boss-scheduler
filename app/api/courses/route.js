import { context, handle, readJson } from '@/lib/server';
import { createCourse, listCourses } from '@/lib/services/courses';

export const dynamic = 'force-dynamic';

// 이번 주 코스
export const GET = handle(async () => ({ courses: await listCourses(context().db) }));

// { title, startAt, memo, stepKeys, characterIds, memberId }
export const POST = handle(async (request) => {
  const body = await readJson(request);
  return { course: await createCourse(context().db, body, { memberId: body.memberId }) };
});
