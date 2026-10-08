'use client';

import { useMemo, useState } from 'react';
import { api, fromLocalInput, toLocalInput } from '@/lib/client';
import { BOSSES, bossKey, bossLabel, getBoss, parseBossKey } from '@/lib/bosses';
import { checkCourse, judge, rateOf, VERDICT } from '@/lib/rates';
import { commonSlots, dayLabel, slotToIso, toRanges } from '@/lib/slots';

const BOSS_KEYS = BOSSES.flatMap((b) => [...b.difficulties].reverse().map((d) => bossKey(b.id, d)));
const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };
const VERDICT_TEXT = { [VERDICT.OK]: '가능', [VERDICT.TIGHT]: '빠듯', [VERDICT.NO]: '부족', [VERDICT.UNKNOWN]: '모름' };

function RateText({ rate }) {
  if (!rate) return <span className="muted">-</span>;
  if (rate.source === 'blocked') return <span className="rate no">입장 불가</span>;
  return <span className={`rate ${VERDICT_CLASS[judge(rate.value)] || ''}`}>{Math.round(rate.value)}%</span>;
}

/**
 * 코스 만들기/고치기: 보스(순서) · 캐릭터 · 시간
 * 예상 파티 배율 = 파티원 배율 합 (lib/rates.js checkCourse)
 */
export default function CourseEditor({ course, characters, members, goals, ctx, meId, week, availability = [], onCancel, onSaved }) {
  const myChars = characters.filter((c) => c.memberId === meId);
  const [stepKeys, setStepKeys] = useState(course?.steps.map((s) => s.bossKey) || []);
  const [characterIds, setCharacterIds] = useState(course?.characterIds || (myChars[0] ? [myChars[0].id] : []));
  const [startAt, setStartAt] = useState(toLocalInput(course?.startAt));
  const [title, setTitle] = useState(course?.title || '');
  const [memo, setMemo] = useState(course?.memo || '');
  const [addKey, setAddKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ownerOf = (c) => members.find((m) => m.id === c.memberId)?.name || '';
  const picked = characters.filter((c) => characterIds.includes(c.id));
  const preview = useMemo(() => checkCourse(picked, stepKeys, ctx), [picked, stepKeys, ctx]);

  // 파티 주인들이 모두 되는 시간
  const owners = [...new Set(picked.map((c) => c.memberId))];
  const ownerSlots = owners.map((id) => availability.find((a) => a.memberId === id)?.slots || null);
  const missing = owners.filter((_, i) => !ownerSlots[i] || !Object.keys(ownerSlots[i]).length);
  const ranges = missing.length || !owners.length ? [] : toRanges(commonSlots(ownerSlots));
  const nameOfMember = (id) => members.find((m) => m.id === id)?.name || '';

  const goalsOf = (id) => goals.filter((g) => g.characterId === id).map((g) => g.bossKey);
  const fillFromGoals = (id) => setStepKeys(goalsOf(id).filter((k) => getBoss(parseBossKey(k).bossId)?.cycle === 'weekly'));

  const move = (i, d) => {
    const next = [...stepKeys];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setStepKeys(next);
  };
  const toggleChar = (id) =>
    setCharacterIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  // 후보: 코스 보스 중 목표가 겹치는 수 → 배율 합이 큰 순
  const candidates = useMemo(() => {
    return characters
      .map((c) => {
        const g = new Set(goalsOf(c.id));
        const match = stepKeys.filter((k) => g.has(k)).length;
        const rates = stepKeys.map((k) => rateOf(c, k, ctx));
        return { c, match, rates };
      })
      .sort((a, b) => b.match - a.match || (b.rates[0]?.value ?? 0) - (a.rates[0]?.value ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, stepKeys, ctx, goals]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const body = { title, memo, stepKeys, characterIds, startAt: fromLocalInput(startAt), memberId: meId };
      if (course) await api(`/api/courses/${course.id}`, { method: 'PUT', body });
      else await api('/api/courses', { method: 'POST', body });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <strong>{course ? '코스 고치기' : '새 코스'}</strong>

      <p className="label">1. 보스 (가는 순서대로)</p>
      {myChars.length > 0 && (
        <div className="chips" style={{ marginBottom: 6 }}>
          {myChars.map((c) => (
            <button type="button" key={c.id} className="chip" onClick={() => fillFromGoals(c.id)}>
              {c.name} 목표로 채우기
            </button>
          ))}
        </div>
      )}
      {stepKeys.map((k, i) => (
        <div className="row step" key={k}>
          <span className="muted">{i + 1}</span>
          <span className="grow">{bossLabel(k)}</span>
          <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">
            ↑
          </button>
          <button type="button" disabled={i === stepKeys.length - 1} onClick={() => move(i, 1)} aria-label="아래로">
            ↓
          </button>
          <button type="button" onClick={() => setStepKeys(stepKeys.filter((x) => x !== k))} aria-label="빼기">
            ✕
          </button>
        </div>
      ))}
      <div className="row">
        <select className="grow" value={addKey} onChange={(e) => setAddKey(e.target.value)}>
          <option value="">보스 추가…</option>
          {BOSS_KEYS.filter((k) => !stepKeys.includes(k)).map((k) => (
            <option key={k} value={k}>
              {bossLabel(k)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!addKey}
          onClick={() => {
            setStepKeys([...stepKeys, addKey]);
            setAddKey('');
          }}
        >
          추가
        </button>
      </div>

      <p className="label">2. 같이 갈 캐릭터</p>
      {stepKeys.length === 0 && <p className="muted">보스를 먼저 고르면 캐릭터별 배율이 나옵니다.</p>}
      <div className="cand-list">
        {candidates.map(({ c, match, rates }) => (
          <label key={c.id} className={`cand ${characterIds.includes(c.id) ? 'on' : ''}`}>
            <input type="checkbox" checked={characterIds.includes(c.id)} onChange={() => toggleChar(c.id)} />
            <span className="grow">
              <strong>{c.name}</strong> <span className="muted">{ownerOf(c)}</span>
              {stepKeys.length > 0 && (
                <span className="muted"> · 목표 {match}/{stepKeys.length}</span>
              )}
              <span className="cand-rates">
                {rates.map((r, i) => (
                  <span key={stepKeys[i]}>
                    <RateText rate={r} />
                  </span>
                ))}
              </span>
            </span>
          </label>
        ))}
      </div>

      <p className="label">3. 언제</p>
      {owners.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {missing.length > 0 ? (
            <p className="muted">가능 시간 미입력: {missing.map(nameOfMember).join(', ')}</p>
          ) : ranges.length === 0 ? (
            <p className="muted">이번 주에 모두 되는 시간이 없습니다.</p>
          ) : (
            <>
              <p className="muted">모두 되는 시간 (누르면 시작 시간으로)</p>
              <div className="chips">
                {ranges.map((r) => {
                  const iso = slotToIso(week, `${r.day}-${r.from}`);
                  const on = fromLocalInput(startAt) === iso;
                  return (
                    <button
                      type="button"
                      key={`${r.day}-${r.from}`}
                      className={`chip time-chip ${on ? 'on' : ''}`}
                      onClick={() => setStartAt(toLocalInput(iso))}
                    >
                      {dayLabel(week, r.day)} {r.from}~{r.to}시
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
      <div className="row" style={{ marginTop: 6 }}>
        <input className="grow" placeholder="코스 이름 (선택)" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <input className="grow" placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      {stepKeys.length > 0 && picked.length > 0 && (
        <>
          <p className="label">예상 파티 배율 (파티원 배율 합)</p>
          {preview.steps.map((s) => (
            <div className="row step" key={s.bossKey}>
              <span className="grow">{bossLabel(s.bossKey)}</span>
              <span className={`rate ${VERDICT_CLASS[s.verdict] || ''}`}>
                {s.partyRate == null ? '-' : `${Math.round(s.partyRate)}%`} {VERDICT_TEXT[s.verdict]}
              </span>
            </div>
          ))}
        </>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        <span className="grow" />
        <button type="button" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button type="button" className="primary" onClick={save} disabled={busy || !stepKeys.length || !characterIds.length}>
          저장
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
