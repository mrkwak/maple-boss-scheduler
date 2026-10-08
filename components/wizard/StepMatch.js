'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { getBoss, parseBossKey } from '@/lib/bosses';
import { judge, partyRate, VERDICT } from '@/lib/rates';
import { dayTimeToIso } from '@/lib/hopeTime';
import { findTimeConflicts } from '@/lib/conflicts';
import { openParties, PARTY, partyState } from '@/lib/party';
import BossName from '../BossName';
import TimePicker, { commonRanges, firstCommon } from '../TimePicker';
import Shell from './Shell';

const SIZES = [2, 3, 4, 5, 6];
const NEW = 'new';
const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };
const VERDICT_TEXT = { [VERDICT.OK]: '가능', [VERDICT.TIGHT]: '빠듯', [VERDICT.NO]: '부족', [VERDICT.UNKNOWN]: '모름' };

function RateLine({ members, bossKey, ctx }) {
  const total = partyRate(members, bossKey, ctx);
  const v = total == null ? VERDICT.UNKNOWN : judge(total);
  return (
    <span className={`rate ${VERDICT_CLASS[v] || ''}`}>
      {total == null ? '-' : `${Math.round(total)}%`} {VERDICT_TEXT[v]}
    </span>
  );
}

// 5단계: 보스마다 희망 인원 → 모집 중 파티 합류 또는 새로 모집 → (다 찬 파티는) 약속 시간
export default function StepMatch({ me, character, characters, members, goals, courses, availability, ctx, week, onBack, onFinished }) {
  const [sizes, setSizes] = useState({}); // bossKey → 인원
  const [choice, setChoice] = useState({}); // bossKey → course id | NEW
  const [full, setFull] = useState(null); // 저장 후 다 찬 파티들
  const [when, setWhen] = useState({ day: null, time: '21:00' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const charOf = (id) => characters.find((c) => c.id === id);
  const ownerName = (c) => members.find((m) => m.id === c?.memberId)?.name || '';
  const slotsByMember = Object.fromEntries(availability.map((a) => [a.memberId, a.slots]));

  // 아직 파티(모집 포함)에 안 들어간 내 주간 보스
  const taken = new Set(courses.filter((c) => c.status !== 'canceled' && c.characterIds.includes(character.id)).flatMap((c) => c.steps.map((s) => s.bossKey)));
  const myKeys = goals
    .filter((g) => g.characterId === character.id && getBoss(parseBossKey(g.bossKey).bossId)?.cycle === 'weekly')
    .map((g) => g.bossKey)
    .filter((k) => !taken.has(k));

  const optionsFor = (k) => (sizes[k] ? openParties({ courses, bossKey: k, size: sizes[k], me: character, characters, slotsByMember }) : []);

  const pickSize = (k, n) => {
    const next = sizes[k] === n ? null : n;
    setSizes((s) => ({ ...s, [k]: next }));
    const best = next ? openParties({ courses, bossKey: k, size: next, me: character, characters, slotsByMember })[0] : null;
    setChoice((c) => ({ ...c, [k]: best ? best.course.id : NEW }));
  };

  const plan = myKeys.filter((k) => sizes[k]);

  // 합류·새 모집 저장 → 다 찬 파티가 있으면 시간 정하기
  const save = async () => {
    setBusy(true);
    setError('');
    const saved = [];
    try {
      for (const k of plan) {
        const { course } =
          choice[k] === NEW
            ? await api('/api/courses', { method: 'POST', body: { stepKeys: [k], characterIds: [character.id], partySize: sizes[k], memberId: me.id } })
            : await api(`/api/courses/${choice[k]}/join`, { method: 'POST', body: { characterId: character.id } });
        saved.push({ course, joined: choice[k] !== NEW });
      }
      const summary = { joined: saved.filter((s) => s.joined).length, created: saved.filter((s) => !s.joined).length, timed: 0 };
      const done = saved.map((s) => s.course).filter((c) => partyState(c) === PARTY.NEED_TIME);
      setResult(summary);
      if (done.length) {
        const ranges = commonRanges([...new Set(done.flatMap((c) => c.characterIds.map((id) => charOf(id)?.memberId)))], availability);
        setWhen(firstCommon(ranges) || { day: null, time: '21:00' });
        setFull(done);
        setBusy(false);
      } else {
        await onFinished(summary);
      }
    } catch (e) {
      setError(saved.length ? `${saved.length}개 저장 후 실패: ${e.message}` : e.message);
      setBusy(false);
    }
  };

  const saveTime = async (skip) => {
    setBusy(true);
    setError('');
    try {
      if (!skip) {
        const startAt = dayTimeToIso(week, when.day, when.time);
        for (const c of full) await api(`/api/courses/${c.id}`, { method: 'PUT', body: { startAt } });
      }
      await onFinished({ ...result, timed: skip ? 0 : full.length });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (full) {
    const ownerIds = [...new Set(full.flatMap((c) => c.characterIds.map((id) => charOf(id)?.memberId)))];
    const ranges = commonRanges(ownerIds, availability);
    const startAt = when.day == null ? '' : dayTimeToIso(week, when.day, when.time);
    const conflictNames = startAt
      ? [
          ...new Set(
            findTimeConflicts(
              [...courses.filter((c) => !full.some((f) => f.id === c.id)), ...full.map((c) => ({ ...c, startAt }))],
              characters,
            )
              .filter((x) => full.some((f) => f.id === x.a.id || f.id === x.b.id))
              .map((x) => x.names.join('·')),
          ),
        ]
      : [];
    return (
      <Shell
        step={4}
        title="파티가 다 찼어요! 시간을 정해요"
        hint="다 찬 파티의 약속 시간이에요. 지금 못 정하면 일정 탭에서 나중에 정할 수 있어요."
        error={error}
        onBack={() => saveTime(true)}
        backLabel="나중에"
        next={{ label: '이 시간으로 확정', onClick: () => saveTime(false), disabled: when.day == null || !when.time, busy }}
      >
        <div className="party-summary column">
          {full.map((c) => (
            <div key={c.id} className="row">
              <BossName bossKey={c.steps[0].bossKey} />
              <span className="muted">{c.characterIds.map((id) => charOf(id)?.name).join(' · ')}</span>
            </div>
          ))}
        </div>
        {conflictNames.length > 0 && <p className="warn-box">⚠️ 같은 사람이 비슷한 시간에 다른 캐릭으로 들어가 있어요: {conflictNames.join(', ')}</p>}
        <TimePicker week={week} ranges={ranges} day={when.day} time={when.time} onChange={setWhen} />
      </Shell>
    );
  }

  if (myKeys.length === 0) {
    return (
      <Shell step={4} title="매칭할 보스가 없어요" onBack={onBack}>
        <div className="empty">
          <p className="muted">고른 주간 보스가 모두 파티(모집 포함)에 들어가 있어요. 일정 탭에서 확인하세요.</p>
          <button type="button" className="big ghost" onClick={() => onFinished({ joined: 0, created: 0, timed: 0 })}>
            완료
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      step={4}
      title="보스마다 몇 명이서 갈까요?"
      hint="인원을 누르면 같은 인원으로 모집 중인 파티를 찾아요. 없으면 새로 모집해요. 인원을 안 고른 보스는 이번에 빼요."
      error={error}
      onBack={onBack}
      next={{ label: plan.length ? `매칭하기 (${plan.length}개)` : '인원을 골라 주세요', onClick: save, disabled: !plan.length, busy }}
    >
      {myKeys.map((k) => {
        const opts = optionsFor(k);
        return (
          <div key={k} className={`party-card ${sizes[k] ? 'on' : ''}`}>
            <div className="row">
              <span className="grow">
                <BossName bossKey={k} />
              </span>
            </div>
            <div className="size-buttons">
              {SIZES.map((n) => (
                <button type="button" key={n} className={`size-btn ${sizes[k] === n ? 'on' : ''}`} aria-pressed={sizes[k] === n} onClick={() => pickSize(k, n)}>
                  {n}인
                </button>
              ))}
            </div>
            {sizes[k] && (
              <div className="party-options">
                {opts.map(({ course }) => {
                  const party = course.characterIds.map(charOf).filter(Boolean);
                  const on = choice[k] === course.id;
                  return (
                    <button type="button" key={course.id} className={`option ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setChoice((c) => ({ ...c, [k]: course.id }))}>
                      <span className="radio" aria-hidden />
                      <span className="grow">
                        <strong>합류</strong> {party.map((c) => `${c.name}(${ownerName(c)})`).join(' · ')}
                        <small className="muted"> {party.length}/{course.partySize} → {party.length + 1}/{course.partySize}</small>
                      </span>
                      <RateLine members={[...party, character]} bossKey={k} ctx={ctx} />
                    </button>
                  );
                })}
                <button type="button" className={`option ${choice[k] === NEW ? 'on' : ''}`} aria-pressed={choice[k] === NEW} onClick={() => setChoice((c) => ({ ...c, [k]: NEW }))}>
                  <span className="radio" aria-hidden />
                  <span className="grow">
                    <strong>새로 모집</strong> <small className="muted">{sizes[k]}인 파티 (1/{sizes[k]})</small>
                  </span>
                  <RateLine members={[character]} bossKey={k} ctx={ctx} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </Shell>
  );
}
