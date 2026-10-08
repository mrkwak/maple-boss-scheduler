import { context, handle } from '@/lib/server';
import { copyLastWeek } from '@/lib/services/goals';

export const dynamic = 'force-dynamic';

// 지난주 주간 목표를 이번 주로 복사
export const POST = handle(async (_request, { params }) => ({ goals: await copyLastWeek(context().db, params.characterId) }));
