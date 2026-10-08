'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { getBoss, parseBossKey } from '@/lib/bosses';
import { recommend } from '@/lib/matching';
import { judge, partyRate, rateOf, VERDICT } from '@/lib/rates';
import { DAYS, commonSlots, toRanges } from '@/lib/slots';
import { dayTimeToIso } from '@/lib/hopeTime';
import { findTimeConflicts } from '@/lib/conflicts';
import BossName from '../BossName';
import { splitDay } from './StepHope';
import Shell from './Shell';

const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };
const VERDICT_TEXT = { [VERDICT.OK]: '가능', [VERDICT.TIGHT]: '빠듯', [VERDICT.NO]: '부족', [VERDICT.UNKNOWN]: '모름' };
const pad = (n) => String(n % 24).padStart(2, '0');

// 이번 주 다른 코스에 이미 들어간 보스 (캐릭터별)
function assignedMap(courses) {
  const map = {};
  for (const co of courses) {
    if (co.status === 'canceled') continue;
    for (const id of co.characterIds) map[id] = [...(map[id] || []), ...co.steps.map((s) => s.bossKey)];
  }
  return map;
}

// 보스마다 기본 파티: 목표가 같은 사람마다 점수 제일 높은 캐릭 하나 (같은 사람 캐릭 둘은 한 파티 불가)
function defaultPicks(keys, recs) {
  const picks = {};
  for (const k of keys) {
    const seen = new Set();
    picks[k] = [];
    for (const r of recs) {
      if (!r.sharedKeys.includes(k) || seen.has(r.character.memberId)) continue;
      seen.add(r.character.memberId);
      picks[k].push(r.character.id);
    }
  }
  return picks;
}

function RateText({ rate }) {
  if (!rate) return <span className="muted">-</span>;
  if (rate.source === 'blocked') return <span className="rate no">입장 불가</span>;
  return <span className={`rate ${VERDICT_CLASS[judge(rate.value)] || ''}`}>{Math.round(rate.value)}%</span>;
}

// 5단계: [매칭하기] → 보스마다 같이 갈 사람 → 약속 시간 → 보스별 파티 저장
export default function StepMatch({ me, character, characters, members, goals, courses, availability, ctx, week, onBack, onFinished, onReset }) {
  const [recs, setRecs] = useState(null);
  const [picks, setPicks] = useState({});
  const [timing, setTiming] = useState(false);
  const [day, setDay] = useState(null);
  const [time, setTime] = useState('21:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const assigned = useMemo(() => assignedMap(courses), [courses]);
  const myKeys = goals
    .filter((g) => g.characterId === character.id && getBoss(parseBossKey(g.bossKey).bossId)?.cycle === 'weekly')
    .map((g) => g.bossKey)
    .filter((k) => !(assigned[character.id] || []).includes(k));

  const runMatch = () => {
    const goalsByCharacter = {};
    for (const g of goals) goalsByCharacter[g.characterId] = [...(goalsByCharacter[g.characterId] || []), g.bossKey];
    const slotsByMember = Object.fromEntries(availability.map((a) => [a.memberId, a.slots]));
    const found = recommend({ stepKeys: myKeys, base: character, characters, goalsByCharacter, assignedByCharacter: assigned, slotsByMember, ctx });
    setRecs(found);
    setPicks(defaultPicks(myKeys, found));
  };

  const charOf = (id) => characters.find((c) => c.id === id);
  const ownerName = (c) => members.find((m) => m.id === c.memberId)?.name || '';

  // 같은 사람 캐릭은 한 파티에 하나만: 고르면 그 사람의 다른 캐릭은 빠짐
  const toggle = (key, id) =>
    setPicks((p) => {
      const cur = p[key] || [];
      if (cur.includes(id)) return { ...p, [key]: cur.filter((x) => x !== id) };
      const owner = charOf(id).memberId;
      return { ...p, [key]: [...cur.filter((x) => charOf(x).memberId !== owner), id] };
    });

  const parties = myKeys
    .filter((k) => (picks[k] || []).length)
    .map((k) => ({ bossKey: k, party: [character, ...picks[k].map(charOf)] }));

  // 파티에 들어간 모든 사람의 희망 시간이 겹치는 구간
  const ownerIds = [...new Set(parties.flatMap((p) => p.party.map((c) => c.memberId)))];
  const common = toRanges(commonSlots(ownerIds.map((id) => availability.find((a) => a.memberId === id)?.slots || {})));

  const startAt = day == null ? '' : dayTimeToIso(week, day, time);
  const conflicts = startAt
    ? findTimeConflicts(
        [...courses, ...parties.map((p, i) => ({ id: `new-${i}`, startAt, status: 'planned', characterIds: p.party.map((c) => c.id), steps: [{ bossKey: p.bossKey }] }))],
        characters,
      ).filter((c) => c.a.id.startsWith('new-') || c.b.id.startsWith('new-'))
    : [];
  const conflictNames = [...new Set(conflicts.map((c) => `${c.names.join('·')}`))];

  const goTiming = () => {
    if (common[0]) {
      setDay(common[0].day);
      setTime(`${pad(common[0].from)}:00`);
    }
    setTiming(true);
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    let saved = 0;
    try {
      for (const p of parties) {
        await api('/api/courses', {
          method: 'POST',
          body: { stepKeys: [p.bossKey], characterIds: p.party.map((c) => c.id), startAt, memberId: me.id },
        });
        saved += 1;
      }
      await onFinished(saved);
    } catch (e) {
      setError(saved ? `${saved}개 저장 후 실패: ${e.message}` : e.message);
      setBusy(false);
    }
  };

  if (timing) {
    return (
      <Shell
        step={4}
        title="약속 시간을 정해요"
        hint="모두 되는 시간을 누르거나, 요일과 시각을 직접 고르세요."
        error={error}
        onBack={() => setTiming(false)}
        next={{ label: `파티 ${parties.length}개 확정`, onClick: confirm, disabled: day == null || !time, busy }}
      >
        <div className="party-summary column">
          {parties.map((p) => (
            <div key={p.bossKey} className="row">
              <BossName bossKey={p.bossKey} />
              <span className="muted">{p.party.map((c) => c.name).join(' · ')}</span>
            </div>
          ))}
        </div>
        {conflictNames.length > 0 && (
          <p className="warn-box">⚠️ 같은 사람이 비슷한 시간에 다른 캐릭으로 들어가 있어요: {conflictNames.join(', ')}</p>
        )}
        {common.length > 0 ? (
          <>
            <p className="label">모두 되는 시간</p>
            <div className="chips">
              {common.map((r) => (
                <button
                  type="button"
                  key={`${r.day}-${r.from}`}
                  className={`chip time-chip ${day === r.day && time === `${pad(r.from)}:00` ? 'on' : ''}`}
                  onClick={() => {
                    setDay(r.day);
                    setTime(`${pad(r.from)}:00`);
                  }}
                >
                  {splitDay(week, r.day).wd} {r.from}~{r.to}시
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">희망 시간이 겹치는 때가 없어요. 이야기해서 정한 시간을 넣어 주세요.</p>
        )}
        <p className="label">요일</p>
        <div className="day-buttons">
          {Array.from({ length: DAYS }, (_, d) => {
            const { wd, date } = splitDay(week, d);
            return (
              <button type="button" key={d} className={`day-btn ${day === d ? 'on' : ''}`} aria-pressed={day === d} onClick={() => setDay(d)}>
                <strong>{wd}</strong>
                <small>{date}</small>
              </button>
            );
          })}
        </div>
        <p className="label">시작 시각</p>
        <input type="time" className="big-input center" value={time} onChange={(e) => setTime(e.target.value)} />
      </Shell>
    );
  }

  if (!recs) {
    return (
      <Shell step={4} title="파티를 찾아볼까요?" hint="같은 보스를 고른 사람 중 배율·시간이 맞는 캐릭터를 찾아요." onBack={onBack}>
        <div className="match-start">
          <div className="party-summary">
            {myKeys.map((k) => (
              <BossName key={k} bossKey={k} />
            ))}
          </div>
          {myKeys.length === 0 ? (
            <p className="muted">매칭할 주간 보스가 없어요. 이미 파티가 정해졌거나 고른 보스가 없어요.</p>
          ) : (
            <button type="button" className="big primary hero" onClick={runMatch}>
              매칭하기
            </button>
          )}
          {myKeys.length === 0 && (
            <button type="button" className="big ghost" onClick={onReset}>
              처음으로
            </button>
          )}
        </div>
      </Shell>
    );
  }

  if (recs.length === 0) {
    return (
      <Shell step={4} title="아직 같이 갈 사람이 없어요" onBack={onBack}>
        <div className="empty">
          <p className="muted">다른 사람들이 신청하면 다시 매칭해 보세요. 지금까지 입력한 내용은 저장됐어요.</p>
          <button type="button" className="big ghost" onClick={onReset}>
            처음으로
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      step={4}
      title="보스마다 같이 갈 사람"
      hint="추천대로 체크해 뒀어요. 누르면 빼거나 넣을 수 있어요. 아무도 없는 보스는 이번에 정하지 않아요."
      error={error}
      onBack={() => setRecs(null)}
      next={{ label: parties.length ? `파티 ${parties.length}개 · 시간 정하기` : '같이 갈 사람을 골라 주세요', onClick: goTiming, disabled: !parties.length }}
    >
      {myKeys.map((k) => {
        const cands = recs.filter((r) => r.sharedKeys.includes(k));
        const chosen = (picks[k] || []).map(charOf);
        const total = chosen.length ? partyRate([character, ...chosen], k, ctx) : null;
        const verdict = total == null ? VERDICT.UNKNOWN : judge(total);
        return (
          <div key={k} className={`party-card ${chosen.length ? 'on' : ''}`}>
            <div className="row">
              <span className="grow">
                <BossName bossKey={k} />
              </span>
              {chosen.length > 0 && (
                <span className={`rate ${VERDICT_CLASS[verdict] || ''}`}>
                  {chosen.length + 1}인 {total == null ? '-' : `${Math.round(total)}%`} {VERDICT_TEXT[verdict]}
                </span>
              )}
            </div>
            <div className="mate-list">
              <span className="mate me">
                {character.name} <RateText rate={rateOf(character, k, ctx)} />
              </span>
              {cands.length === 0 && <span className="muted">이 보스를 고른 사람이 없어요</span>}
              {cands.map(({ character: c }) => {
                const on = (picks[k] || []).includes(c.id);
                return (
                  <button type="button" key={c.id} className={`mate ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(k, c.id)}>
                    {on ? '✓ ' : '+ '}
                    {c.name} <small>{ownerName(c)}</small> <RateText rate={rateOf(c, k, ctx)} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Shell>
  );
}
