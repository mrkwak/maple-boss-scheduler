// 보스 마스터 데이터 (ADR-0006)
// - 보스·난이도 목록: maplescouter "파티 보스컷" 화면에 표시된 목록 기준 (2026-10-08 확인)
// - maxParty(최대 파티 인원): 미확인 → null. 공식 정보로 채우고 verifiedAt 기록
// - cycle: 검은 마법사만 월간으로 둠 (커뮤니티 언급 기준, 공식 확인 필요)
// - defense(보스 방어율 %): 2026-10-08 maplescouter 보스 정보 화면에서 본 값 (게임 데이터, 공식 출처 재확인 필요).
//   모르는 보스·난이도는 넣지 않음 → 배율 추정 시 방어율 보정 없이 계산
// - authForce(요구 어센틱포스): 같은 화면에서 본 값. 발드릭스 700은 나무위키·공략 사이트로 재확인
//   아케인포스 보스(검은 마법사 등)와 모르는 보스는 넣지 않음 → 포스 보정 없이 계산

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'chaos', 'extreme'];

export const DIFFICULTY_LABEL = {
  easy: '이지',
  normal: '노말',
  hard: '하드',
  chaos: '카오스',
  extreme: '익스트림',
};

const weekly = (id, name, difficulties, defense = {}) => ({ id, name, difficulties, cycle: 'weekly', defense });
const all = (difficulties, value) => Object.fromEntries(difficulties.map((d) => [d, value]));

const AUTH_FORCE = {
  jupiter: { normal: 810, hard: 810 },
  kaling: { easy: 230, normal: 330, hard: 350, extreme: 480 },
  adversary: { easy: 220, normal: 320, hard: 340, extreme: 460 },
  kalos: { easy: 200, normal: 300, chaos: 330, extreme: 440 },
  baldrix: { normal: 700, hard: 700 },
  bellona: { easy: 400, normal: 450, hard: 550 },
  limbo: { normal: 500, hard: 500 },
  hyungseong: { normal: 400, hard: 550 },
  seren: { normal: 200, hard: 200, extreme: 200 },
};

export const BOSSES = [
  weekly('jupiter', '유피테르', ['normal', 'hard'], all(['normal', 'hard'], 380)),
  weekly('kaling', '카링', ['easy', 'normal', 'hard', 'extreme'], all(['easy', 'normal', 'hard', 'extreme'], 380)),
  weekly('adversary', '최초의 대적자', ['easy', 'normal', 'hard', 'extreme'], all(['easy', 'normal', 'hard', 'extreme'], 380)),
  weekly('kalos', '칼로스', ['easy', 'normal', 'chaos', 'extreme'], all(['easy', 'normal', 'chaos', 'extreme'], 380)),
  weekly('baldrix', '발드릭스', ['normal', 'hard'], all(['normal', 'hard'], 380)),
  weekly('bellona', '벨로나', ['easy', 'normal', 'hard'], all(['easy', 'normal', 'hard'], 380)),
  weekly('limbo', '림보', ['normal', 'hard'], all(['normal', 'hard'], 380)),
  weekly('hyungseong', '흉성', ['normal', 'hard'], all(['normal', 'hard'], 380)),
  weekly('seren', '선택받은 세렌', ['normal', 'hard', 'extreme'], all(['normal', 'hard', 'extreme'], 380)),
  { id: 'blackmage', name: '검은 마법사', difficulties: ['hard', 'extreme'], cycle: 'monthly', defense: all(['hard', 'extreme'], 300) },
  weekly('swoo', '스우', ['normal', 'hard', 'extreme'], { extreme: 380 }),
  weekly('jinhilla', '진 힐라', ['normal', 'hard'], all(['normal', 'hard'], 300)),
  weekly('dunkel', '듄켈', ['normal', 'hard'], all(['normal', 'hard'], 300)),
  weekly('dusk', '더스크', ['normal', 'chaos'], all(['normal', 'chaos'], 300)),
  weekly('gaenseul', '가디언 엔젤 슬라임', ['normal', 'chaos']),
  weekly('will', '윌', ['easy', 'normal', 'hard']),
  weekly('lucid', '루시드', ['easy', 'normal', 'hard']),
  weekly('damien', '데미안', ['normal', 'hard']),
].map((b) => ({ maxParty: null, verifiedAt: null, authForce: AUTH_FORCE[b.id] || {}, ...b }));

const byId = new Map(BOSSES.map((b) => [b.id, b]));

export function getBoss(bossId) {
  return byId.get(bossId) || null;
}

// 보스+난이도 한 쌍을 가리키는 키. 예) 'swoo:extreme'
export function bossKey(bossId, difficulty) {
  return `${bossId}:${difficulty}`;
}

export function parseBossKey(key) {
  const [bossId, difficulty] = String(key).split(':');
  return { bossId, difficulty };
}

export function isValidBossKey(key) {
  const { bossId, difficulty } = parseBossKey(key);
  const boss = getBoss(bossId);
  return !!boss && boss.difficulties.includes(difficulty);
}

export function bossLabel(key) {
  const { bossId, difficulty } = parseBossKey(key);
  const boss = getBoss(bossId);
  if (!boss) return key;
  return `${DIFFICULTY_LABEL[difficulty] || difficulty} ${boss.name}`;
}

// 보스 방어율(%). 모르면 null
export function defenseOf(key) {
  const { bossId, difficulty } = parseBossKey(key);
  return getBoss(bossId)?.defense?.[difficulty] ?? null;
}

// 요구 어센틱포스. 모르면 null
export function authForceOf(key) {
  const { bossId, difficulty } = parseBossKey(key);
  return getBoss(bossId)?.authForce?.[difficulty] ?? null;
}

// 보스별 최대 인원(boss.maxParty)은 숫자 또는 { 난이도: 숫자 } 형태. 모르면 null
export function maxPartyOf(key) {
  const { bossId, difficulty } = parseBossKey(key);
  const boss = getBoss(bossId);
  if (!boss || boss.maxParty == null) return null;
  if (typeof boss.maxParty === 'number') return boss.maxParty;
  return boss.maxParty[difficulty] ?? null;
}
