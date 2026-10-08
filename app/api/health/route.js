import { NextResponse } from 'next/server';
import { redisEnv } from '@/lib/db/redis';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ok: true,
    storage: redisEnv() ? 'redis' : process.env.SHEET_ID ? 'sheets' : 'memory',
    specProvider: process.env.SPEC_PROVIDER || 'manual',
    nexon: Boolean(process.env.NEXON_API_KEY),
    // 저장소 연결 확인용: 값은 내보내지 않고 이름만
    storageEnv: Object.keys(process.env).filter((k) => /^(KV_|UPSTASH_|REDIS_)/.test(k)).sort(),
  });
}
