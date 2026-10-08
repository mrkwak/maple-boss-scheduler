'use client';

import { useState } from 'react';
import { api, formatWhen } from '@/lib/client';
import { bossLabel } from '@/lib/bosses';
import { checkCourse, VERDICT } from '@/lib/rates';
import CourseEditor from './CourseEditor';
import BossName from './BossName';

const VERDICT_CLASS = { [VERDICT.OK]: 'ok', [VERDICT.TIGHT]: 'tight', [VERDICT.NO]: 'no' };
const VERDICT_TEXT = { [VERDICT.OK]: '가능', [VERDICT.TIGHT]: '빠듯', [VERDICT.NO]: '부족', [VERDICT.UNKNOWN]: '모름' };

// 이번 주 코스 목록. 배율은 화면에서 매번 계산 → 환산을 갱신하면 바로 반영
export default function Courses({ courses, characters, members, goals, ctx, meId, week, availability = [], onChanged }) {
  const [editing, setEditing] = useState(null); // null | 'new' | course
  const [error, setError] = useState('');

  const charOf = (id) => characters.find((c) => c.id === id);
  const ownerOf = (c) => members.find((m) => m.id === c?.memberId)?.name || '';

  const remove = async (course) => {
    if (!window.confirm('이 코스를 삭제할까요?')) return;
    try {
      await api(`/api/courses/${course.id}`, { method: 'DELETE' });
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const editorProps = { characters, members, goals, ctx, meId, week, availability, onCancel: () => setEditing(null) };

  return (
    <div>
      {editing === 'new' ? (
        <CourseEditor {...editorProps} onSaved={async () => { setEditing(null); await onChanged(); }} />
      ) : (
        <button className="primary" onClick={() => setEditing('new')} style={{ marginBottom: 8 }}>
          새 코스 만들기
        </button>
      )}
      {courses.length === 0 && editing !== 'new' && <p className="muted">이번 주 코스가 없습니다.</p>}
      {courses.map((course) => {
        if (editing?.id === course.id) {
          return (
            <CourseEditor
              key={course.id}
              {...editorProps}
              course={course}
              onSaved={async () => {
                setEditing(null);
                await onChanged();
              }}
            />
          );
        }
        const party = course.characterIds.map(charOf).filter(Boolean);
        const result = checkCourse(party, course.steps.map((s) => s.bossKey), ctx);
        return (
          <div className={`card course ${course.status}`} key={course.id}>
            <div className="row">
              <strong className="grow">{course.title || course.steps.map((s) => bossLabel(s.bossKey)).join(' → ')}</strong>
              <span className={`badge ${VERDICT_CLASS[result.verdict] || ''}`}>{VERDICT_TEXT[result.verdict]}</span>
            </div>
            <div className="muted">
              {formatWhen(course.startAt)}
              {course.status === 'canceled' && ' · 취소됨'}
              {course.status === 'done' && ' · 완료'}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {party.map((c) => `${c.name}(${ownerOf(c)})`).join(' · ')}
            </div>
            {result.steps.map((s, i) => (
              <div className="row step" key={s.bossKey}>
                <span className="muted">{i + 1}</span>
                <span className="grow">
                  <BossName bossKey={s.bossKey} />
                </span>
                <span className={`rate ${VERDICT_CLASS[s.verdict] || ''}`}>
                  {s.partyRate == null ? '-' : `${Math.round(s.partyRate)}%`}
                </span>
              </div>
            ))}
            {course.memo && <p className="muted">{course.memo}</p>}
            <div className="row" style={{ marginTop: 6 }}>
              <button onClick={() => setEditing(course)}>고치기</button>
              <button className="danger" onClick={() => remove(course)}>
                삭제
              </button>
            </div>
          </div>
        );
      })}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
