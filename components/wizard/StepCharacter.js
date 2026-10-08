'use client';

import { useState } from 'react';
import { api, formatSpec } from '@/lib/client';
import { hexaOf } from '@/lib/rates';
import { buildBoard, CELL } from '@/lib/board';
import Shell from './Shell';

// 1단계: 내 캐릭터 고르기 또는 새로 등록
// 이번 주 상태 한 줄: 미신청 / 미정 N / 파티 N
function statusOf(board, id) {
  const cells = Object.values(board.cells[id] || {});
  if (!cells.length) return { text: '미신청', cls: '' };
  const pending = cells.filter((c) => c.state === CELL.GOAL).length;
  const fixed = cells.length - pending;
  return pending ? { text: `미정 ${pending}${fixed ? ` · 파티 ${fixed}` : ''}`, cls: 'warn' } : { text: `파티 ${fixed} 확정`, cls: 'ok' };
}

export default function StepCharacter({ me, characters, goals, courses, ctx, onPicked, reload }) {
  const mine = characters.filter((c) => c.memberId === me.id);
  const board = buildBoard(mine, goals, courses);
  const [adding, setAdding] = useState(mine.length === 0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warn, setWarn] = useState('');

  const register = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { character, warnings } = await api('/api/characters', { method: 'POST', body: { memberId: me.id, name } });
      setWarn(warnings?.join(' ') || '');
      await reload();
      onPicked(character.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell step={0} title="어떤 캐릭터로 갈까요?" hint="캐릭터를 누르면 다음으로 넘어가요." error={error}>
      <div className="pick-list">
        {mine.map((c) => {
          const hexa = hexaOf(c, ctx);
          return (
            <button type="button" key={c.id} className="pick-card" onClick={() => onPicked(c.id)}>
              <span className="avatar" aria-hidden>
                {c.name.slice(0, 1)}
              </span>
              <span className="grow">
                <strong>{c.name}</strong>
                <span className={`badge ${statusOf(board, c.id).cls}`}>{statusOf(board, c.id).text}</span>
                <span className="muted">
                  {[c.className, c.level && `Lv.${c.level}`].filter(Boolean).join(' · ') || '정보 없음'}
                </span>
              </span>
              <span className="pick-spec">{hexa ? formatSpec(Math.round(hexa.value)) : '환산 없음'}</span>
            </button>
          );
        })}
      </div>
      {adding ? (
        <form className="add-form" onSubmit={register}>
          <label className="label" htmlFor="new-char">
            새 캐릭터 닉네임
          </label>
          <div className="row">
            <input id="new-char" className="grow big-input" placeholder="예: 집사0" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="big primary" disabled={busy || !name.trim()}>
              {busy ? '찾는 중…' : '등록'}
            </button>
          </div>
          <p className="muted">넥슨 정보에서 직업·레벨을 자동으로 가져와요.</p>
          {warn && <p className="muted">{warn}</p>}
        </form>
      ) : (
        <button type="button" className="big dashed full" onClick={() => setAdding(true)}>
          ＋ 새 캐릭터 등록
        </button>
      )}
    </Shell>
  );
}
