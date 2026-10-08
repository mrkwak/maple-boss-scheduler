import { context, handle, readJson } from '@/lib/server';
import { listAvailability, setAvailability } from '@/lib/services/availability';
import { weekKey } from '@/lib/week';

export const dynamic = 'force-dynamic';

// ?week=2026-10-08 (기본: 이번 주)
export const GET = handle(async (request) => {
  const week = new URL(request.url).searchParams.get('week') || weekKey();
  return { week, list: await listAvailability(context().db, week) };
});

// { memberId, week, slots, memo }
export const PUT = handle(async (request) => {
  const { memberId, week, slots, memo } = await readJson(request);
  return { availability: await setAvailability(context().db, memberId, week || weekKey(), { slots, memo }) };
});
