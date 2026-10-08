import { context, handle } from '@/lib/server';
import { currentPeriods, listGoals } from '@/lib/services/goals';

export const dynamic = 'force-dynamic';

// 이번 주·이번 달 목표 전체
export const GET = handle(async () => {
  const { week, month } = currentPeriods();
  return { week, month, goals: await listGoals(context().db, [week, month]) };
});
