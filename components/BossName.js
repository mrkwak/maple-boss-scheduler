import { DIFFICULTY_LABEL, getBoss, parseBossKey } from '@/lib/bosses';

// 난이도 색 배지 + 보스 이름. 예: [익스] 스우
export function DiffBadge({ difficulty }) {
  return <span className={`diff diff-${difficulty}`}>{DIFFICULTY_LABEL[difficulty]}</span>;
}

export default function BossName({ bossKey }) {
  const { bossId, difficulty } = parseBossKey(bossKey);
  return (
    <span className="boss-name">
      <DiffBadge difficulty={difficulty} />
      {getBoss(bossId)?.name || bossId}
    </span>
  );
}
