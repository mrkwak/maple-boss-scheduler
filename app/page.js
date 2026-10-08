import { BOSSES, DIFFICULTY_LABEL } from '@/lib/bosses';
import { weekKey, monthKey } from '@/lib/week';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
      <h1>보스 파티</h1>
      <p>
        이번 주차: {weekKey()} · 이번 달: {monthKey()}
      </p>
      <p>화면은 M1부터 만듭니다. 지금은 기본 구조만 있습니다.</p>
      <h2>보스 목록</h2>
      <ul>
        {BOSSES.map((b) => (
          <li key={b.id}>
            {b.name} ({b.difficulties.map((d) => DIFFICULTY_LABEL[d]).join(', ')})
            {b.cycle === 'monthly' ? ' · 월간' : ''}
          </li>
        ))}
      </ul>
    </main>
  );
}
