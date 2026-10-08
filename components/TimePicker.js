'use client';

import { DAYS, commonSlots, dayLabel, toRanges } from '@/lib/slots';

const pad = (n) => String(n % 24).padStart(2, '0');

// '10/8(목)' → { wd: '목', date: '10/8' }
export function splitDay(week, day) {
  const m = /^(.+)\((.)\)$/.exec(dayLabel(week, day));
  return m ? { wd: m[2], date: m[1] } : { wd: '', date: dayLabel(week, day) };
}

// 멤버들의 희망 시간이 모두 겹치는 구간 [{ day, from, to }]
export function commonRanges(memberIds, availability) {
  return toRanges(commonSlots(memberIds.map((id) => availability.find((a) => a.memberId === id)?.slots || {})));
}

// 첫 공통 구간을 기본값으로: { day, time } 또는 null
export function firstCommon(ranges) {
  return ranges[0] ? { day: ranges[0].day, time: `${pad(ranges[0].from)}:00` } : null;
}

// 약속 시간 고르기: 모두 되는 시간 칩 + 요일 버튼 + 시각 입력
export default function TimePicker({ week, ranges, day, time, onChange }) {
  return (
    <div className="time-picker">
      {ranges.length > 0 ? (
        <>
          <p className="label">모두 되는 시간</p>
          <div className="chips">
            {ranges.map((r) => {
              const t = `${pad(r.from)}:00`;
              return (
                <button
                  type="button"
                  key={`${r.day}-${r.from}`}
                  className={`chip time-chip ${day === r.day && time === t ? 'on' : ''}`}
                  onClick={() => onChange({ day: r.day, time: t })}
                >
                  {splitDay(week, r.day).wd} {r.from}~{r.to}시
                </button>
              );
            })}
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
            <button type="button" key={d} className={`day-btn ${day === d ? 'on' : ''}`} aria-pressed={day === d} onClick={() => onChange({ day: d, time })}>
              <strong>{wd}</strong>
              <small>{date}</small>
            </button>
          );
        })}
      </div>
      <p className="label">시작 시각</p>
      <input type="time" className="big-input center" value={time} onChange={(e) => onChange({ day, time: e.target.value })} />
    </div>
  );
}
