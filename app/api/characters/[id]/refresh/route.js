import { context, handle } from '@/lib/server';
import { refreshBasic } from '@/lib/services/roster';

export const dynamic = 'force-dynamic';

// 넥슨 API 기본정보·전투력 다시 가져오기
export const POST = handle(async (_request, { params }) => ({ character: await refreshBasic(context(), params.id) }));
