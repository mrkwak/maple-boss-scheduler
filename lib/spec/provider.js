// 환산 공급자 (ADR-0002)
// 결과 형태: { hexaSpec: number|null, bossRates: { [bossKey]: number }, sourceUrl, fetchedAt: Date, raw }
//
// - manual: 자동 조회 없음. 사용자가 직접 입력한 값을 그대로 쓴다.
// - maplescouter: 운영자 허락을 받았다는 가정으로 자리만 만들어 둠.
//   조회 방식(공식 API·엔드포인트·호출 제한)은 운영자 답변을 받은 뒤 구현한다.
//   그 전에는 사이트 내부 요청을 추정해 호출하지 않는다 (약관 제15조).

export class SpecProviderNotReady extends Error {
  constructor(message) {
    super(message);
    this.name = 'SpecProviderNotReady';
  }
}

export function maplescouterUrl(characterName) {
  return `https://maplescouter.com/ko/info?name=${encodeURIComponent(characterName)}`;
}

export const manualProvider = {
  id: 'manual',
  canFetch: false,
  async fetchSpec() {
    throw new SpecProviderNotReady('수동 입력 모드입니다. 환산은 직접 입력해 주세요.');
  },
};

export const maplescouterProvider = {
  id: 'maplescouter',
  canFetch: false,
  async fetchSpec() {
    throw new SpecProviderNotReady('maplescouter 조회 방식이 아직 정해지지 않았습니다 (운영자 답변 대기).');
  },
};

const PROVIDERS = { manual: manualProvider, maplescouter: maplescouterProvider };

export function getSpecProvider(id = process.env.SPEC_PROVIDER) {
  return PROVIDERS[id] || manualProvider;
}

// 수동 입력값 정리: 헥사 환산(필수), 보스 배율(선택)
export function normalizeManualSpec({ hexaSpec, bossRates } = {}) {
  const spec = Number(String(hexaSpec ?? '').replace(/,/g, ''));
  if (!Number.isFinite(spec) || spec <= 0) {
    throw new Error('헥사 환산은 0보다 큰 숫자여야 합니다.');
  }
  const rates = {};
  for (const [key, v] of Object.entries(bossRates || {})) {
    const n = Number(String(v).replace(/[%,\s]/g, ''));
    if (Number.isFinite(n) && n > 0) rates[key] = n;
  }
  return { hexaSpec: spec, bossRates: rates };
}
