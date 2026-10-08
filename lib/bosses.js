// 보스 마스터 데이터 (ADR-0006)
// - 보스·난이도 목록: maplescouter "파티 보스컷" 화면에 표시된 목록 기준 (2026-10-08 확인)
// - maxParty(최대 파티 인원): 미확인 → null. 공식 정보로 채우고 verifiedAt 기록
// - cycle: 검은 마법사만 월간으로 둠 (커뮤니티 언급 기준, 공식 확인 필요)

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'chaos', 'extreme'];

export const DIFFICULTY_LABEL = {
  easy: '이지',
  normal: '노말',
  hard: '하드',
  chaos: '카오스',
  extreme: '익스트림',
};

const weekly = (id, name, difficulties) => ({ id, name, difficulties, cycle: 'weekly' });

export const BOSSES = [
  weekly('jupiter', '유피테르', ['normal', 'hard']),
  weekly('kaling', '카링', ['easy', 'normal', 'hard', 'extreme']),
  weekly('adversary', '최초의 대적자', ['easy', 'normal', 'hard', 'extreme']),
  weekly('kalos', '칼로스', ['easy', 'normal', 'chaos', 'extreme']),
  weekly('baldrix', '발드릭스', ['normal', 'hard']),
  weekly('bellona', '벨로나', ['easy', 'normal', 'hard']),
  weekly('limbo', '림보', ['normal', 'hard']),
  weekly('hyungseong', '흉성', ['normal', 'hard']),
  weekly('seren', '선택받은 세렌', ['normal', 'hard', 'extreme']),
  { id: 'blackmage', name: '검은 마법사', difficulties: ['hard', 'extreme'], cycle: 'monthly' },
  weekly('swoo', '스우', ['normal', 'hard', 'extreme']),
  weekly('jinhilla', '진 힐라', ['normal', 'hard']),
  weekly('dunkel', '듄켈', ['normal', 'hard']),
  weekly('dusk', '더스크', ['normal', 'chaos']),
  weekly('gaenseul', '가디언 엔젤 슬라임', ['normal', 'chaos']),
  weekly('will', '윌', ['easy', 'normal', 'hard']),
  weekly('lucid', '루시드', ['easy', 'normal', 'hard']),
  weekly('damien', '데미안', ['normal', 'hard']),
].map((b) => ({ maxParty: null, verifiedAt: null, ...b }));

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

// 보스별 최대 인원(boss.maxParty)은 숫자 또는 { 난이도: 숫자 } 형태. 모르면 null
export function maxPartyOf(key) {
  const { bossId, difficulty } = parseBossKey(key);
  const boss = getBoss(bossId);
  if (!boss || boss.maxParty == null) return null;
  if (typeof boss.maxParty === 'number') return boss.maxParty;
  return boss.maxParty[difficulty] ?? null;
}
