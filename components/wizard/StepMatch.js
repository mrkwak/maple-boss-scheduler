'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { getBoss, parseBossKey } from '@/lib/bosses';
import { recommend } from '@/lib/matching';
import { checkCourse, judge, rateOf, VERDICT } from '@/lib/rates';
import { DAYS, commonSlots, toRanges } from '@/lib/slots';
import { dayTimeToIso } from '@/lib/hopeTime';
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

// 5단계: [매칭하기] → 같이 갈 사람 고르기 → 확정 시간 → 코스 저장
export default function StepMatch({ me, character, characters, members, goals, courses, availability, ctx, week, onBack, onFinished, onReset }) {
  const [matched, setMatched] = useState(false);
  const [picked, setPicked] = useState([]);
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

  const recs = useMemo(() => {
    if (!matched) return [];
    const goalsByCharacter = {};
    for (const g of goals) goalsByCharacter[g.characterId] = [...(goalsByCharacter[g.characterId] || []), g.bossKey];
    const slotsByMember = Object.fromEntries(availability.map((a) => [a.memberId, a.slots]));
    return recommend({ stepKeys: myKeys, base: character, characters, goalsByCharacter, assignedByCharacter: assigned, slotsByMember, ctx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, goals, availability, characters, ctx, assigned]);

  const ownerName = (c) => members.find((m) => m.id === c.memberId)?.name || '';
  const pickedRecs = recs.filter((r) => picked.includes(r.character.id));
  // 고른 사람 중 한 명이라도 같이 가는 보스만 코스에 넣음 (내 목표 순서)
  const stepKeys = myKeys.filter((k) => pickedRecs.some((r) => r.sharedKeys.includes(k)));
  const party = [character, ...pickedRecs.map((r) => r.character)];
  const preview = checkCourse(party, stepKeys, ctx);

  // 파티 주인 모두의 희망 시간이 겹치는 구간
  const ownerSlots = [...new Set(party.map((c) => c.memberId))].map((id) => availability.find((a) => a.memberId === id)?.slots || {});
  const common = toRanges(commonSlots(ownerSlots));

  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

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
    try {
      await api('/api/courses', {
        method: 'POST',
        body: { stepKeys, characterIds: party.map((c) => c.id), startAt: dayTimeToIso(week, day, time), memberId: me.id },
      });
      await onFinished();
    } catch (e) {
      setError(e.message);
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
        next={{ label: '이 시간으로 확정', onClick: confirm, disabled: day == null || !time, busy }}
      >
        <div className="party-summary">
          {stepKeys.map((k) => (
            <BossName key={k} bossKey={k} />
          ))}
          <span className="muted">{party.map((c) => c.name).join(' · ')}</span>
        </div>
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

  return (
    <Shell
      step={4}
      title={matched ? '같이 갈 사람을 골라요' : '파티를 찾아볼까요?'}
      hint={
        matched
          ? '같은 보스를 고르고 희망 시간이 비슷한 순서예요. 여러 명 고를 수 있어요.'
          : '같은 보스를 고른 사람 중 배율·시간이 맞는 캐릭터를 찾아요.'
      }
      error={error}
      onBack={onBack}
      next={matched ? { label: picked.length ? `${picked.length}명과 시간 정하기` : '같이 갈 사람을 골라 주세요', onClick: goTiming, disabled: !stepKeys.length } : null}
    >
      {!matched ? (
        <div className="match-start">
          <div className="party-summary">
            {myKeys.map((k) => (
              <BossName key={k} bossKey={k} />
            ))}
          </div>
          {myKeys.length === 0 ? (
            <p className="muted">매칭할 주간 보스가 없어요. 이전으로 돌아가 보스를 골라 주세요.</p>
          ) : (
            <button type="button" className="big primary hero" onClick={() => setMatched(true)}>
              매칭하기
            </button>
          )}
        </div>
      ) : recs.length === 0 ? (
        <div className="empty">
          <p>아직 같은 보스를 고른 사람이 없어요.</p>
          <p className="muted">다른 사람들이 신청하면 다시 매칭해 보세요. 지금까지 입력한 내용은 저장됐어요.</p>
          <button type="button" className="big ghost" onClick={onReset}>
            처음으로
          </button>
        </div>
      ) : (
        <>
          <div className="pick-list">
            {recs.map((r) => {
              const c = r.character;
              const on = picked.includes(c.id);
              return (
                <button type="button" key={c.id} className={`pick-card match ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => togglePick(c.id)}>
                  <span className="check" aria-hidden>
                    {on ? '✓' : ''}
                  </span>
                  <span className="grow">
                    <strong>{c.name}</strong> <span className="muted">{ownerName(c)}</span>
                    <span className="match-rates">
                      {r.sharedKeys.map((k) => {
                        const rate = rateOf(c, k, ctx);
                        return (
                          <span key={k}>
                            <BossName bossKey={k} />{' '}
                            <span className={`rate ${rate && rate.source !== 'blocked' ? VERDICT_CLASS[judge(rate.value)] || '' : ''}`}>
                              {rate && rate.source !== 'blocked' ? `${Math.round(rate.value)}%` : '-'}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                    <span className="muted">시간 겹침 {Math.round(r.time * 100)}%</span>
                  </span>
                </button>
              );
            })}
          </div>
          {pickedRecs.length > 0 && (
            <div className="card preview">
              <p className="label">예상 파티 배율 (합)</p>
              {preview.steps.map((s) => (
                <div className="row step" key={s.bossKey}>
                  <span className="grow">
                    <BossName bossKey={s.bossKey} />
                  </span>
                  <span className={`rate ${VERDICT_CLASS[s.verdict] || ''}`}>
                    {s.partyRate == null ? '-' : `${Math.round(s.partyRate)}%`} {VERDICT_TEXT[s.verdict]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
