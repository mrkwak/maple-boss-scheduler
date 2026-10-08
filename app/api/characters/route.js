import { context, handle, readJson } from '@/lib/server';
import { listCharacters, registerCharacter } from '@/lib/services/roster';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => ({ characters: await listCharacters(context().db) }));

export const POST = handle(async (request) => {
  const body = await readJson(request);
  return registerCharacter(context(), { memberId: body.memberId, name: body.name });
});
