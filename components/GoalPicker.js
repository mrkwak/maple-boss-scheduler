'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { BOSSES, DIFFICULTY_LABEL, bossKey, parseBossKey } from '@/lib/bosses';
import { judge, rateOf, VERDICT } from '@/lib/rates';

const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };

// 보스마다 난이도 하나 고르기. 칩에 내 배율 표시, 레벨 부족은 비활성
export default function GoalPicker({ character, goals, ctx, onCancel, onSaved }) {
  const [selected, setSelected] = useState(() => {
    const m = {};
    for (const g of goals) m[parseBossKey(g.bossKey).bossId] = g.bossKey;
    return m;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key) => {
    const { bossId } = parseBossKey(key);
    setSelected((s) => {
      const next = { ...s };
      if (next[bossId] === key) delete next[bossId];
      else next[bossId] = key;
      return next;
    });
  };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(() => api(`/api/goals/${character.id}`, { method: 'PUT', body: { bossKeys: Object.values(selected) } }));
  const copy = () => run(() => api(`/api/goals/${character.id}/copy`, { method: 'POST' }));

  const weeklyCount = Object.values(selected).filter((k) => BOSSES.find((b) => b.id === parseBossKey(k).bossId)?.cycle === 'weekly').length;

  return (
    <div style={{ marginTop: 8 }}>
      <p className="muted">이번 주 주간 보스 {weeklyCount}개 선택 · 칩의 %는 내 배율</p>
      <div className="goal-list">
        {BOSSES.map((b) => (
          <div className="goal-row" key={b.id}>
            <span className="goal-name">
              {b.name}
              {b.cycle === 'monthly' && <span className="badge">월간</span>}
            </span>
            <div className="chips">
              {[...b.difficulties].reverse().map((d) => {
                const key = bossKey(b.id, d);
                const rate = rateOf(character, key, ctx);
                const blocked = rate?.source === 'blocked';
                const on = selected[b.id] === key;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`chip ${on ? 'on' : ''}`}
                    disabled={blocked || busy}
                    onClick={() => toggle(key)}
                    title={blocked ? '레벨 부족 · 입장 불가' : undefined}
                  >
                    {DIFFICULTY_LABEL[d]}
                    {blocked ? (
                      <span className="rate no"> 입장 불가</span>
                    ) : rate ? (
                      <span className={`rate ${VERDICT_CLASS[judge(rate.value)] || ''}`}> {Math.round(rate.value)}%</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" onClick={copy} disabled={busy}>
          지난주 복사
        </button>
        <span className="grow" />
        <button type="button" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button type="button" className="primary" onClick={save} disabled={busy}>
          저장
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
