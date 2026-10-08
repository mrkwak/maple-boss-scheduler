// 넥슨 Open API 클라이언트 (서버 전용)
// /maplestory/v1/id, /character/basic 은 2026-10-08 실제 호출로 확인.
// 오류는 HTTP 400 + error.name 코드로 옴 (확인한 것: OPENAPI00004 잘못된 파라미터·없는 캐릭터, OPENAPI00005 잘못된 키)

export const NEXON_ERROR = { INVALID_PARAMETER: 'OPENAPI00004', INVALID_KEY: 'OPENAPI00005' };

const BASE_URL = 'https://open.api.nexon.com';

export const STAT_KEYS = {
  '최대 스탯공격력': 'statAttackMax',
  '데미지': 'damage',
  '보스 몬스터 데미지': 'bossDamage',
  '최종 데미지': 'finalDamage',
  '방어율 무시': 'ignoreDefense',
  '크리티컬 확률': 'critRate',
  '크리티컬 데미지': 'critDamage',
  '아케인포스': 'arcaneForce',
  '어센틱포스': 'authenticForce',
  '전투력': 'combatPower',
};

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
    // final_stat 중 보스 배율 추정에 쓰는 값만 숫자로 (항목 이름은 2026-10-08 실제 응답에서 확인)
    async getStats(ocid) {
      const b = await get('/maplestory/v1/character/stat', { ocid });
      const stats = {};
      for (const s of b?.final_stat || []) {
        const key = STAT_KEYS[s.stat_name];
        const n = Number(s.stat_value);
        if (key && Number.isFinite(n)) stats[key] = n;
      }
      return stats;
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
