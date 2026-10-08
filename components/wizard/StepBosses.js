'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { BOSSES, bossKey, parseBossKey } from '@/lib/bosses';
import { judge, rateOf, VERDICT } from '@/lib/rates';
import { DiffBadge } from '../BossName';
import Shell from './Shell';

const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };

// 2단계: 보스마다 난이도 하나 누르기 (여러 보스)
export default function StepBosses({ character, goals, ctx, onBack, onDone }) {
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(goals.map((g) => [parseBossKey(g.bossKey).bossId, g.bossKey])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (bossId, key) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[bossId] === key) delete next[bossId];
      else next[bossId] = key;
      return next;
    });

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/goals/${character.id}`, { method: 'PUT', body: { bossKeys: Object.values(selected) } });
      await onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const count = Object.keys(selected).length;

  return (
    <Shell
      step={1}
      title={`${character.name}, 이번 주 어디 갈까요?`}
      hint="보스마다 난이도를 하나 누르세요. 다시 누르면 빠져요. % 는 내 배율이에요."
      error={error}
      onBack={onBack}
      next={{ label: count ? `${count}개 선택 · 다음` : '보스를 골라 주세요', onClick: save, disabled: !count, busy }}
    >
      <div className="boss-list">
        {BOSSES.map((b) => (
          <div className={`boss-row ${selected[b.id] ? 'picked' : ''}`} key={b.id}>
            <div className="boss-row-name">
              {b.name}
              {b.cycle === 'monthly' && <span className="badge">월간</span>}
            </div>
            <div className="diff-buttons">
              {[...b.difficulties].reverse().map((d) => {
                const key = bossKey(b.id, d);
                const rate = rateOf(character, key, ctx);
                const blocked = rate?.source === 'blocked';
                const on = selected[b.id] === key;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`diff-btn diff-btn-${d} ${on ? 'on' : ''}`}
                    disabled={blocked}
                    aria-pressed={on}
                    onClick={() => toggle(b.id, key)}
                  >
                    <DiffBadge difficulty={d} />
                    <span className={`rate ${blocked ? 'no' : rate ? VERDICT_CLASS[judge(rate.value)] || '' : ''}`}>
                      {blocked ? '레벨 부족' : rate ? `${Math.round(rate.value)}%` : '-'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
