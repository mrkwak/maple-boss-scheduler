// 저장소 선택 (ADR-0007, 0011). Redis 접속 정보 → 스프레드시트(SHEET_ID) → 메모리(개발용) 순.
// 저장소를 바꿀 때는 이 폴더만 교체한다.

import fs from 'node:fs';
import path from 'node:path';
import { createMemoryAdapter } from './memory';
import { createSheetsAdapter } from './sheets';
import { createRedisAdapter, redisEnv } from './redis';

// 개발 서버에서 라우트마다 모듈이 따로 로드돼도 같은 저장소를 쓰도록 전역에 둔다
const holder = globalThis.__mbsDb || (globalThis.__mbsDb = { instance: null });

export function getDb() {
  if (!holder.instance) {
    if (redisEnv()) {
      holder.instance = createRedisAdapter();
    } else if (process.env.SHEET_ID) {
      holder.instance = createSheetsAdapter();
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('운영 환경에서는 저장소(Redis 또는 SHEET_ID)가 필요합니다.');
      }
      holder.instance = createMemoryAdapter(loadLocalSeed());
    }
  }
  return holder.instance;
}

// 개발용 초기 데이터: data/seed.local.json (깃 제외). 없으면 빈 저장소
function loadLocalSeed() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'seed.local.json'), 'utf8'));
  } catch {
    return {};
  }
}

export function newId() {
  return globalThis.crypto.randomUUID();
}
