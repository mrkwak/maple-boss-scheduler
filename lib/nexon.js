// 넥슨 Open API 클라이언트 (서버 전용)
// /maplestory/v1/id, /character/basic 은 2026-10-08 실제 호출로 확인.
// 오류는 HTTP 400 + error.name 코드로 옴 (확인한 것: OPENAPI00004 잘못된 파라미터·없는 캐릭터, OPENAPI00005 잘못된 키)

export const NEXON_ERROR = { INVALID_PARAMETER: 'OPENAPI00004', INVALID_KEY: 'OPENAPI00005' };

const BASE_URL = 'https://open.api.nexon.com';

export class NexonApiError extends Error {
  constructor(status, body) {
    super(`넥슨 API 오류 (${status}${body?.error?.name ? ` ${body.error.name}` : ''})`);
    this.name = 'NexonApiError';
    this.status = status;
    this.code = body?.error?.name || null;
    this.body = body;
  }
}

export function createNexonClient({ apiKey = process.env.NEXON_API_KEY, fetchImpl = fetch } = {}) {
  async function get(path, params) {
    if (!apiKey) throw new Error('NEXON_API_KEY가 설정되지 않았습니다.');
    const url = `${BASE_URL}${path}?${new URLSearchParams(params)}`;
    const res = await fetchImpl(url, { headers: { 'x-nxopen-api-key': apiKey } });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new NexonApiError(res.status, body);
    return body;
  }

  return {
    async getOcid(characterName) {
      const body = await get('/maplestory/v1/id', { character_name: characterName });
      return body?.ocid || null;
    },
    async getBasic(ocid) {
      const b = await get('/maplestory/v1/character/basic', { ocid });
      return {
        name: b?.character_name ?? null,
        world: b?.world_name ?? null,
        className: b?.character_class ?? null,
        level: b?.character_level ?? null,
        image: b?.character_image ?? null,
      };
    },
  };
}
