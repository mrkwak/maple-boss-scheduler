import { context, handle, readJson } from '@/lib/server';
import { createMember, listMembers } from '@/lib/services/roster';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => ({ members: await listMembers(context().db) }));

export const POST = handle(async (request) => {
  const body = await readJson(request);
  return { member: await createMember(context().db, body) };
});
