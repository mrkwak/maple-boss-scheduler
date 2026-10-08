'use client';

import { useMemo, useState } from 'react';
import { BOSSES, bossKey, bossLabel } from '@/lib/bosses';
import { judge, makeRateContext, rankForBoss, VERDICT } from '@/lib/rates';

const BOSS_KEYS = BOSSES.flatMap((b) => [...b.difficulties].reverse().map((d) => bossKey(b.id, d)));
const SOURCE_LABEL = { direct: '직접', estimate: '추정', cut: '컷표' };
const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };

export default function BossRanking({ characters, members, meId }) {
  const [key, setKey] = useState('swoo:extreme');
  const ctx = useMemo(() => makeRateContext({ characters }), [characters]);
  const ranked = useMemo(() => rankForBoss(characters, key, ctx), [characters, key, ctx]);
  const nameOf = (id) => members.find((m) => m.id === id)?.name || '';
  const samples = ctx.calibration[key]?.samples || 0;

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
        {samples
          ? `직접 입력한 배율 ${samples}개로 다른 캐릭터를 추정합니다.`
          : '이 보스는 직접 입력한 배율이 없어 추정할 수 없습니다. 한 캐릭터라도 배율을 입력해 주세요.'}
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
