import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ok: true,
    storage: process.env.SHEET_ID ? 'sheets' : 'memory',
    specProvider: process.env.SPEC_PROVIDER || 'manual',
  });
}
