'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { DAYS, dayLabel } from '@/lib/slots';
import { rangesToSlots, slotsToRanges } from '@/lib/hopeTime';
import Shell from './Shell';

const DEFAULT = { from: '21:00', to: '00:00' };
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

function HourSelect({ value, onChange, label }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {HOUR_OPTIONS.map((v) => (
        <option key={v} value={v}>
          {v === '00:00' ? '0시 (자정)' : `${Number(v.slice(0, 2))}시`}
        </option>
      ))}
    </select>
  );
}

// '10/8(목)' → { wd: '목', date: '10/8' }
export function splitDay(week, day) {
  const m = /^(.+)\((.)\)$/.exec(dayLabel(week, day));
  return m ? { wd: m[2], date: m[1] } : { wd: '', date: dayLabel(week, day) };
}

// 4단계: 요일 누르고 희망 시간(시작~끝) 입력. 요일당 한 구간
export default function StepHope({ me, week, availability, onBack, onDone }) {
  const [byDay, setByDay] = useState(() => {
    const mine = availability.find((a) => a.memberId === me.id);
    return Object.fromEntries(slotsToRanges(mine?.slots).map((r) => [r.day, { from: r.from, to: r.to }]));
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (day) =>
    setByDay((s) => {
      const next = { ...s };
      if (next[day]) delete next[day];
      else next[day] = { ...DEFAULT };
      return next;
    });
  const setTime = (day, patch) => setByDay((s) => ({ ...s, [day]: { ...s[day], ...patch } }));

  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const slots = rangesToSlots(days.map((day) => ({ day, ...byDay[day] })));
      await api('/api/availability', { method: 'PUT', body: { memberId: me.id, week, slots } });
      await onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Shell
      step={3}
      title="언제 갈 수 있어요?"
      hint="되는 요일을 누르고 희망 시간을 적어 주세요. 정확한 약속 시간은 파티가 정해진 뒤에 정해요."
      error={error}
      onBack={onBack}
      next={{ label: days.length ? '저장하고 매칭으로' : '요일을 골라 주세요', onClick: save, disabled: !days.length, busy }}
    >
      <div className="day-buttons">
        {Array.from({ length: DAYS }, (_, d) => {
          const { wd, date } = splitDay(week, d);
          return (
            <button type="button" key={d} className={`day-btn ${byDay[d] ? 'on' : ''}`} aria-pressed={!!byDay[d]} onClick={() => toggleDay(d)}>
              <strong>{wd}</strong>
              <small>{date}</small>
            </button>
          );
        })}
      </div>
      <div className="hope-list">
        {days.map((d) => (
          <div className="hope-row" key={d}>
            <strong className="hope-day">{splitDay(week, d).wd}</strong>
            <HourSelect value={byDay[d].from} onChange={(from) => setTime(d, { from })} label="시작" />
            <span>~</span>
            <HourSelect value={byDay[d].to} onChange={(to) => setTime(d, { to })} label="끝" />
            <button type="button" className="icon-btn" onClick={() => toggleDay(d)} aria-label="빼기">
              ✕
            </button>
          </div>
        ))}
      </div>
      <p className="muted">끝이 시작보다 이르면 다음 날 새벽까지로 봐요. (예: 22시 ~ 2시)</p>
    </Shell>
  );
}
