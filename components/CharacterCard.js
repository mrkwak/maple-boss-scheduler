'use client';

import { useState } from 'react';
import { api, formatDate, formatSpec } from '@/lib/client';
import { bossLabel } from '@/lib/bosses';
import { hexaOf, judge, rateOf, VERDICT } from '@/lib/rates';
import GoalPicker from './GoalPicker';
import SpecForm from './SpecForm';

const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };

export default function CharacterCard({ character: c, ctx, goals = [], editable = false, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    if (!window.confirm(`${c.name} 캐릭터를 삭제할까요? 목표와 코스 배정도 함께 지워집니다.`)) return;
    try {
      await api(`/api/characters/${c.id}`, { method: 'DELETE' });
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const rates = Object.entries(c.bossRates || {});
  const hexa = hexaOf(c, ctx);
  const noDamage = hexa?.source === 'estimate' && hexa.value === 0;

  const refresh = async () => {
    try {
      await api(`/api/characters/${c.id}/refresh`, { method: 'POST' });
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card">
      <div className="row">
        <div className="grow">
          <strong>{c.name}</strong>{' '}
          <span className="muted">
            {[c.className, c.level && `Lv.${c.level}`, c.world, c.combatPower && `전투력 ${formatSpec(c.combatPower)}`]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="muted">
          환산주스탯
        </a>
      </div>
      <div className="row">
        <span className="spec">
          헥사 {noDamage ? '-' : `${hexa?.source === 'estimate' ? '약 ' : ''}${formatSpec(hexa ? Math.round(hexa.value) : null)}`}
        </span>
        {hexa?.source === 'estimate' && <span className="badge">추정</span>}
        {noDamage && <span className="badge warn">방무 부족 (방어율 380% 보스 딜 없음)</span>}
        {c.specUpdatedAt && <span className="muted">{formatDate(c.specUpdatedAt)} 갱신</span>}
        {c.specStale && <span className="badge warn">오래됨</span>}
        {!hexa && <span className="badge warn">환산 입력 필요</span>}
      </div>
      {rates.length > 0 && (
        <div className="rates">
          {rates
            .slice(0, 3)
            .map(([k, v]) => `${bossLabel(k)} ${v}%`)
            .join(' · ')}
          {rates.length > 3 && ` 외 ${rates.length - 3}개 (보스 배율 순위에서 확인)`}
        </div>
      )}
      {goals.length > 0 && (
        <div className="goals-summary">
          <span className="muted">목표</span>
          {goals.map((g) => {
            const r = rateOf(c, g.bossKey, ctx);
            return (
              <span key={g.bossKey}>
                {bossLabel(g.bossKey)}
                {r && r.source !== 'blocked' && (
                  <span className={`rate ${VERDICT_CLASS[judge(r.value)] || ''}`}> {Math.round(r.value)}%</span>
                )}
              </span>
            );
          })}
        </div>
      )}
      {editable && !editing && !picking && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="primary" onClick={() => setPicking(true)}>
            주간 목표
          </button>
          <button onClick={() => setEditing(true)}>환산 입력</button>
          {c.ocid && <button onClick={refresh}>정보 갱신</button>}
          <button className="danger" onClick={remove}>
            삭제
          </button>
        </div>
      )}
      {editing && (
        <SpecForm
          character={c}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onChanged();
          }}
        />
      )}
      {picking && (
        <GoalPicker
          character={c}
          goals={goals}
          ctx={ctx}
          onCancel={() => setPicking(false)}
          onSaved={async () => {
            setPicking(false);
            await onChanged();
          }}
        />
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
