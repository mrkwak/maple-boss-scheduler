// API 라우트 공통 (서버 전용)

import { NextResponse } from 'next/server';
import { getDb } from './db';
import { createNexonClient } from './nexon';
import { getSpecProvider } from './spec/provider';
import { UserError } from './services/roster';

export function context() {
  return {
    db: getDb(),
    nexon: process.env.NEXON_API_KEY ? createNexonClient() : null,
    provider: getSpecProvider(),
  };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new UserError('요청 형식이 잘못되었습니다.');
  }
}

// 핸들러를 감싸 UserError는 메시지 그대로, 나머지는 500으로 응답
export function handle(fn) {
  return async (request, ctx) => {
    try {
      const data = await fn(request, ctx);
      return NextResponse.json(data ?? { ok: true });
    } catch (e) {
      if (e instanceof UserError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error(e);
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
  };
}
