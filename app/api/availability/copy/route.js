import { context, handle, readJson } from '@/lib/server';
import { copyLastWeekAvailability } from '@/lib/services/availability';
import { weekKey } from '@/lib/week';

export const dynamic = 'force-dynamic';

// { memberId, week } — 지난주 가능 시간 복사
export const POST = handle(async (request) => {
  const { memberId, week } = await readJson(request);
  return { availability: await copyLastWeekAvailability(context().db, memberId, week || weekKey()) };
});
