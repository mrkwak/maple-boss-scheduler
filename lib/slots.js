// 가능 시간 칸 (M4)
// 칸 키 = `${day}-${hour}` — day: 주차 시작일(목요일)부터 0~6, hour: 0~23 (KST)
// slots 객체 = { '0-21': true, ... }

import { shiftWeek } from './week';

export const DAYS = 7;
export const HOURS = 24;

export function slotKey(day, hour) {
  return `${day}-${hour}`;
}

// 주차 키('2026-10-08') + 칸 → ISO (KST 기준 그 시각)
export function slotToIso(week, key) {
  const [day, hour] = key.split('-').map(Number);
  const [y, m, d] = week.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + day, hour) - 9 * 3600 * 1000).toISOString();
}

// 주차 시작일부터 day번째 날짜 'M/D(요일)'
export function dayLabel(week, day) {
  const [y, m, d] = week.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + day));
  const wd = ['일', '월', '화', '수', '목', '금', '토'][t.getUTCDay()];
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}(${wd})`;
}

export function cleanSlots(slots) {
  const out = {};
  for (const [k, v] of Object.entries(slots || {})) {
    const m = /^(\d)-(\d{1,2})$/.exec(k);
    if (v && m && Number(m[1]) < DAYS && Number(m[2]) < HOURS) out[k] = true;
  }
  return out;
}

// 칸마다 가능한 사람 수
export function heat(slotsList) {
  const count = {};
  for (const slots of slotsList) for (const k of Object.keys(slots || {})) if (slots[k]) count[k] = (count[k] || 0) + 1;
  return count;
}

// 모두 되는 칸 (시간 순)
export function commonSlots(slotsList) {
  if (!slotsList.length) return [];
  const count = heat(slotsList);
  return Object.keys(count)
    .filter((k) => count[k] === slotsList.length)
    .sort((a, b) => {
      const [da, ha] = a.split('-').map(Number);
      const [db, hb] = b.split('-').map(Number);
      return da - db || ha - hb;
    });
}

// 연속된 칸 묶기: ['0-20','0-21','0-22','2-21'] → [{ day:0, from:20, to:23 }, { day:2, from:21, to:22 }]
export function toRanges(keys) {
  const ranges = [];
  for (const k of keys) {
    const [day, hour] = k.split('-').map(Number);
    const last = ranges[ranges.length - 1];
    if (last && last.day === day && last.to === hour) last.to = hour + 1;
    else ranges.push({ day, from: hour, to: hour + 1 });
  }
  return ranges;
}

export { shiftWeek };
