'use client';

import { useRef } from 'react';
import { DAYS, HOURS, dayLabel, slotKey } from '@/lib/slots';

/**
 * 요일(목~수) × 시간(0~23시) 칸
 * - editable: 누르거나 끌어서 켜고 끄기
 * - counts/total: 사람 수 히트맵 (읽기 전용)
 */
export default function AvailabilityGrid({ week, slots = {}, onChange, editable = false, counts, total = 0 }) {
  const drag = useRef(null); // 끌 때 켤지(true) 끌지(false)

  const apply = (key, on) => {
    if (!!slots[key] === on) return;
    const next = { ...slots };
    if (on) next[key] = true;
    else delete next[key];
    onChange(next);
  };

  const down = (key) => (e) => {
    if (!editable) return;
    e.preventDefault();
    drag.current = !slots[key];
    apply(key, drag.current);
  };
  const enter = (key) => () => {
    if (editable && drag.current != null) apply(key, drag.current);
  };
  // 터치로 끌 때는 손가락 아래 칸을 찾아야 함
  const move = (e) => {
    if (!editable || drag.current == null || e.pointerType === 'mouse') return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const key = el?.dataset?.slot;
    if (key) apply(key, drag.current);
  };
  const up = () => {
    drag.current = null;
  };

  return (
    <div
      className={`grid ${editable ? 'editing' : ''}`}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
    >
      <div className="grid-head" />
      {Array.from({ length: DAYS }, (_, d) => (
        <div className="grid-head" key={d}>
          {dayLabel(week, d)}
        </div>
      ))}
      {Array.from({ length: HOURS }, (_, h) => (
        <div className="grid-row" key={h}>
          <div className="grid-hour">{h}시</div>
          {Array.from({ length: DAYS }, (_, d) => {
            const key = slotKey(d, h);
            const n = counts?.[key] || 0;
            const style = counts && total ? { '--heat': n / total } : undefined;
            return (
              <div
                key={key}
                data-slot={key}
                className={`cell ${slots[key] ? 'on' : ''} ${counts ? 'heat' : ''} ${counts && n === total && total > 0 ? 'all' : ''}`}
                style={style}
                onPointerDown={down(key)}
                onPointerEnter={enter(key)}
                title={counts ? `${n}/${total}명` : undefined}
              >
                {counts && n > 0 ? n : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
