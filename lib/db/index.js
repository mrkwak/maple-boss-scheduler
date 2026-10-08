// 저장소 선택 (ADR-0007). SHEET_ID가 있으면 스프레드시트, 없으면 메모리(개발용).
// 저장소를 바꿀 때는 이 폴더만 교체한다.

import { createMemoryAdapter } from './memory';
import { createSheetsAdapter } from './sheets';

// 개발 서버에서 라우트마다 모듈이 따로 로드돼도 같은 저장소를 쓰도록 전역에 둔다
const holder = globalThis.__mbsDb || (globalThis.__mbsDb = { instance: null });

export function getDb() {
  if (!holder.instance) {
    if (process.env.SHEET_ID) {
      holder.instance = createSheetsAdapter();
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('운영 환경에서는 SHEET_ID가 필요합니다.');
      }
      holder.instance = createMemoryAdapter();
    }
  }
  return holder.instance;
}

export function newId() {
  return globalThis.crypto.randomUUID();
}
