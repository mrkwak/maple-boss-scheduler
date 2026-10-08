'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { checkCourse, VERDICT } from '@/lib/rates';
import { dayTimeToIso } from '@/lib/hopeTime';
import { conflictsByCourse, findTimeConflicts } from '@/lib/conflicts';
import { PARTY, partyState } from '@/lib/party';
import BossName from './BossName';
import CourseEditor from './CourseEditor';
import TimePicker, { commonRanges, firstCommon } from './TimePicker';

const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };
const VERDICT_TEXT = { [VERDICT.OK]: '가능', [VERDICT.TIGHT]: '빠듯', [VERDICT.NO]: '부족', [VERDICT.UNKNOWN]: '모름' };

const kst = (iso, opts) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', ...opts });
const dayKey = (iso) => {
  const [m, d] = kst(iso, { month: 'numeric', day: 'numeric' }).match(/\d+/g);
  return `${m}/${d} (${kst(iso, { weekday: 'short' })})`;
};
const timeOf = (iso) => kst(iso, { hour: '2-digit', minute: '2-digit', hour12: false });

// 날짜 → 시각 → 파티들
function groupByDay(courses) {
  const days = [];
  for (const c of courses) {
    const d = dayKey(c.startAt);
    let day = days.find((x) => x.key === d);
    if (!day) days.push((day = { key: d, slots: [] }));
    const t = timeOf(c.startAt);
    let slot = day.slots.find((x) => x.time === t);
    if (!slot) day.slots.push((slot = { time: t, courses: [] }));
    slot.courses.push(c);
  }
  return days;
}

// 이번 주 일정: 모집 중 → 시간 미정 → 확정(요일별, 클리어 체크)
export default function Schedule({ courses, characters, members, goals, ctx, meId, week, availability, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [timing, setTiming] = useState(null); // { id, day, time }
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const charOf = (id) => characters.find((c) => c.id === id);
  const ownerOf = (c) => members.find((m) => m.id === c?.memberId)?.name || '';
  const live = courses.filter((c) => c.status !== 'canceled');
  const byState = (s) => live.filter((c) => partyState(c) === s);
  const recruiting = byState(PARTY.RECRUITING);
  const needTime = byState(PARTY.NEED_TIME);
  const fixed = byState(PARTY.FIXED);
  const conflicts = conflictsByCourse(findTimeConflicts(fixed, characters));
  const steps = fixed.flatMap((c) => c.steps);
  const clearedCount = steps.filter((s) => s.cleared).length;

  const run = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const myCharIn = (course) => course.characterIds.map(charOf).find((c) => c?.memberId === meId);
  const leave = (course) => {
    const mine = myCharIn(course);
    if (!mine || !window.confirm(`${mine.name}(이)가 이 파티에서 빠질까요?`)) return;
    run(course.id, () => api(`/api/courses/${course.id}/leave`, { method: 'POST', body: { characterId: mine.id } }));
  };
  const closeNow = (course) =>
    run(course.id, () => api(`/api/courses/${course.id}`, { method: 'PUT', body: { partySize: course.characterIds.length } }));
  const remove = (course) => {
    if (!window.confirm('이 파티를 삭제할까요?')) return;
    run(course.id, () => api(`/api/courses/${course.id}`, { method: 'DELETE' }));
  };
  const toggleClear = (course, step) =>
    run(course.id, () => api(`/api/courses/${course.id}/clear`, { method: 'PATCH', body: { bossKey: step.bossKey, cleared: !step.cleared } }));
  const openTiming = (course) => {
    const ranges = commonRanges([...new Set(course.characterIds.map((id) => charOf(id)?.memberId))], availability);
    setTiming({ id: course.id, ...(firstCommon(ranges) || { day: null, time: '21:00' }) });
  };
  const saveTime = (course) =>
    run(course.id, async () => {
      await api(`/api/courses/${course.id}`, { method: 'PUT', body: { startAt: dayTimeToIso(week, timing.day, timing.time) } });
      setTiming(null);
    });

  if (editing) {
    return (
      <CourseEditor
        course={editing}
        characters={characters}
        members={members}
        goals={goals}
        ctx={ctx}
        meId={meId}
        week={week}
        availability={availability}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await onChanged();
        }}
      />
    );
  }

  if (!live.length) {
    return (
      <div className="empty">
        <p>이번 주 파티가 없어요.</p>
        <p className="muted">신청 탭에서 매칭하면 여기에 모여요.</p>
      </div>
    );
  }

  const partyLine = (course) => {
    const party = course.characterIds.map(charOf).filter(Boolean);
    return { party, result: checkCourse(party, course.steps.map((s) => s.bossKey), ctx), mine: party.some((c) => c.memberId === meId) };
  };

  const membersText = (party) => party.map((c) => `${c.name}(${ownerOf(c)})`).join(' · ');

  return (
    <div className="schedule">
      {error && <p className="error">{error}</p>}

      {recruiting.length > 0 && (
        <section className="sched-group">
          <h3 className="sched-head">모집 중 <span className="count">{recruiting.length}</span></h3>
          {recruiting.map((course) => {
            const { party, result, mine } = partyLine(course);
            return (
              <div key={course.id} className={`card party recruiting ${mine ? 'mine' : ''}`}>
                <div className="row">
                  <span className="grow">
                    <BossName bossKey={course.steps[0].bossKey} />
                  </span>
                  <span className="fill">
                    {party.length}/{course.partySize}명
                  </span>
                </div>
                <div className="fill-bar" aria-hidden>
                  <span style={{ width: `${(party.length / course.partySize) * 100}%` }} />
                </div>
                <div className="muted">{membersText(party)}</div>
                <div className="muted">
                  지금 배율 합 <span className={`rate ${VERDICT_CLASS[result.steps[0]?.verdict] || ''}`}>{result.steps[0]?.partyRate == null ? '-' : `${Math.round(result.steps[0].partyRate)}%`}</span>
                </div>
                {mine && (
                  <div className="row party-foot">
                    <span className="grow" />
                    {party.length >= 2 && (
                      <button type="button" className="link" disabled={busyId === course.id} onClick={() => closeNow(course)}>
                        이 인원으로 확정
                      </button>
                    )}
                    <button type="button" className="link danger" disabled={busyId === course.id} onClick={() => leave(course)}>
                      빠지기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {needTime.length > 0 && (
        <section className="sched-group">
          <h3 className="sched-head">시간 미정 <span className="count">{needTime.length}</span></h3>
          {needTime.map((course) => {
            const { party, result, mine } = partyLine(course);
            const ranges = commonRanges([...new Set(party.map((c) => c.memberId))], availability);
            return (
              <div key={course.id} className={`card party ${mine ? 'mine' : ''}`}>
                {result.steps.map((s) => (
                  <div className="row" key={s.bossKey}>
                    <span className="grow">
                      <BossName bossKey={s.bossKey} />
                    </span>
                    <span className={`rate ${VERDICT_CLASS[s.verdict] || ''}`}>
                      {party.length}인 {s.partyRate == null ? '-' : `${Math.round(s.partyRate)}%`} {VERDICT_TEXT[s.verdict]}
                    </span>
                  </div>
                ))}
                <div className="muted">{membersText(party)}</div>
                {timing?.id === course.id ? (
                  <>
                    <TimePicker week={week} ranges={ranges} day={timing.day} time={timing.time} onChange={(v) => setTiming({ ...timing, ...v })} />
                    <div className="row party-foot">
                      <span className="grow" />
                      <button type="button" onClick={() => setTiming(null)}>
                        취소
                      </button>
                      <button type="button" className="primary" disabled={timing.day == null || busyId === course.id} onClick={() => saveTime(course)}>
                        이 시간으로 확정
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="big primary full" onClick={() => openTiming(course)}>
                    시간 정하기
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}

      {fixed.length > 0 && (
        <section className="sched-group">
          <h3 className="sched-head">
            확정 <span className="count">{fixed.length}</span>
            <span className="clear-progress">
              클리어 {clearedCount}/{steps.length}
            </span>
          </h3>
          {groupByDay(fixed).map((day) => (
            <section key={day.key} className="sched-day">
              <h4 className="sched-date">{day.key}</h4>
              {day.slots.map((slot) => {
                const names = [...new Set(slot.courses.flatMap((c) => (conflicts[c.id] || []).map((x) => x.names.join('·'))))];
                return (
                  <div key={slot.time} className="sched-slot">
                    <div className="sched-time">{slot.time}</div>
                    <div className="sched-parties">
                      {names.length > 0 && <p className="warn-box">⚠️ 같은 시간대에 한 사람이 다른 캐릭으로: {names.join(', ')}</p>}
                      {slot.courses.map((course) => {
                        const { party, result, mine } = partyLine(course);
                        const allCleared = course.steps.every((s) => s.cleared);
                        return (
                          <div key={course.id} className={`card party ${mine ? 'mine' : ''} ${allCleared ? 'cleared' : ''}`}>
                            {result.steps.map((s) => {
                              const step = course.steps.find((x) => x.bossKey === s.bossKey);
                              return (
                                <div className="row" key={s.bossKey}>
                                  <span className="grow">
                                    <BossName bossKey={s.bossKey} />{' '}
                                    <span className={`rate ${VERDICT_CLASS[s.verdict] || ''}`}>
                                      {party.length}인 {s.partyRate == null ? '-' : `${Math.round(s.partyRate)}%`}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    className={`clear-btn ${step.cleared ? 'on' : ''}`}
                                    aria-pressed={step.cleared}
                                    disabled={busyId === course.id}
                                    onClick={() => toggleClear(course, step)}
                                  >
                                    {step.cleared ? '✓ 클리어' : '클리어'}
                                  </button>
                                </div>
                              );
                            })}
                            <div className="row party-foot">
                              <span className="grow muted">{membersText(party)}</span>
                              <button type="button" className="link" onClick={() => setEditing(course)}>
                                고치기
                              </button>
                              <button type="button" className="link danger" onClick={() => remove(course)}>
                                삭제
                              </button>
                            </div>
                            {course.memo && <p className="muted">{course.memo}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </section>
      )}
    </div>
  );
}
