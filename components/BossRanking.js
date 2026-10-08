'use client';

import { useMemo, useState } from 'react';
import { BOSSES, bossKey, bossLabel } from '@/lib/bosses';
import { baseOf, judge, rankForBoss, VERDICT } from '@/lib/rates';

const BOSS_KEYS = BOSSES.flatMap((b) => [...b.difficulties].reverse().map((d) => bossKey(b.id, d)));
const SOURCE_LABEL = { direct: '직접', cut: '계산', estimate: '추정' };
const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };

export default function BossRanking({ characters, members, meId, ctx }) {
  const [key, setKey] = useState('swoo:extreme');
  const ranked = useMemo(() => rankForBoss(characters, key, ctx), [characters, key, ctx]);
  const nameOf = (id) => members.find((m) => m.id === id)?.name || '';
  const base = baseOf(key, ctx);

  return (
    <div className="card">
      <div className="row">
        <select className="grow" value={key} onChange={(e) => setKey(e.target.value)}>
          {BOSS_KEYS.map((k) => (
            <option key={k} value={k}>
              {bossLabel(k)}
            </option>
          ))}
        </select>
      </div>
      <p className="muted">
        {base
          ? `100% 기준 헥사환산 ${Math.round(base.base).toLocaleString('ko-KR')}${
              base.source === 'derived' ? ` (직접 입력 배율 ${base.samples}개로 역산)` : ' (컷표)'
            }`
          : '이 보스는 기준값이 없습니다. 헥사환산과 이 보스 배율을 함께 입력한 캐릭터가 한 명 필요합니다.'}
      </p>
      <ol className="ranking">
        {ranked.map(({ character: c, rate }) => (
          <li key={c.id} className={c.memberId === meId ? 'mine' : ''}>
            <span className="grow">
              {c.name} <span className="muted">{nameOf(c.memberId)}</span>
            </span>
            {rate ? (
              <>
                <span className={`rate ${VERDICT_CLASS[judge(rate.value)] || ''}`}>{rate.value.toFixed(1)}%</span>
                <span className="badge">{SOURCE_LABEL[rate.source]}</span>
              </>
            ) : (
              <span className="muted">-</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
