// 저장소 선택 (ADR-0007). SHEET_ID가 있으면 스프레드시트, 없으면 메모리(개발용).
// 저장소를 바꿀 때는 이 폴더만 교체한다.

import { createMemoryAdapter } from './memory';
import { createSheetsAdapter } from './sheets';

let instance = null;

export function getDb() {
  if (!instance) {
    if (process.env.SHEET_ID) {
      instance = createSheetsAdapter();
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('운영 환경에서는 SHEET_ID가 필요합니다.');
      }
      instance = createMemoryAdapter();
    }
  }
  return instance;
}

export function newId() {
  return globalThis.crypto.randomUUID();
}
