'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { checkCourse, VERDICT } from '@/lib/rates';
import { conflictsByCourse, findTimeConflicts } from '@/lib/conflicts';
import BossName from './BossName';
import CourseEditor from './CourseEditor';

const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };
const VERDICT_TEXT = { [VERDICT.OK]: '가능', [VERDICT.TIGHT]: '빠듯', [VERDICT.NO]: '부족', [VERDICT.UNKNOWN]: '모름' };

const kst = (iso, opts) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', ...opts });
const dayKey = (iso) => {
  if (!iso) return '시간 미정';
  const [m, d] = kst(iso, { month: 'numeric', day: 'numeric' }).match(/\d+/g);
  return `${m}/${d} (${kst(iso, { weekday: 'short' })})`;
};
const timeOf = (iso) => (iso ? kst(iso, { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

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

// 이번 주 확정 일정 (요일별). 보스별 파티를 같은 시각끼리 묶어 보여줌
export default function Schedule({ courses, characters, members, goals, ctx, meId, week, availability, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const charOf = (id) => characters.find((c) => c.id === id);
  const ownerOf = (c) => members.find((m) => m.id === c?.memberId)?.name || '';
  const live = courses.filter((c) => c.status !== 'canceled');
  const conflicts = conflictsByCourse(findTimeConflicts(live, characters));

  const remove = async (course) => {
    if (!window.confirm('이 파티를 삭제할까요?')) return;
    try {
      await api(`/api/courses/${course.id}`, { method: 'DELETE' });
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

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
        <p>이번 주 확정된 파티가 없어요.</p>
        <p className="muted">신청 탭에서 매칭하면 여기에 모여요.</p>
      </div>
    );
  }

  return (
    <div className="schedule">
      {groupByDay(live).map((day) => (
        <section key={day.key} className="sched-day">
          <h3 className="sched-date">{day.key}</h3>
          {day.slots.map((slot) => (
            <div key={slot.time} className="sched-slot">
              <div className="sched-time">{slot.time || '-'}</div>
              <div className="sched-parties">
                {(() => {
                  const names = [...new Set(slot.courses.flatMap((c) => (conflicts[c.id] || []).map((x) => x.names.join('·'))))];
                  return names.length > 0 && <p className="warn-box">⚠️ 같은 시간대에 한 사람이 다른 캐릭으로: {names.join(', ')}</p>;
                })()}
                {slot.courses.map((course) => {
                  const party = course.characterIds.map(charOf).filter(Boolean);
                  const result = checkCourse(party, course.steps.map((s) => s.bossKey), ctx);
                  const mine = party.some((c) => c.memberId === meId);
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
                      <div className="row party-foot">
                        <span className="grow muted">{party.map((c) => `${c.name}(${ownerOf(c)})`).join(' · ')}</span>
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
          ))}
        </section>
      ))}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
