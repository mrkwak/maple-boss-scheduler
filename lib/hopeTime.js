// 신청 화면의 희망 시간 (요일 + 시작~끝) ↔ 가능 시간 칸 (lib/slots.js)
// day: 주차 시작일(목)부터 0~6, from/to: 'HH:MM' (KST)
// 끝이 시작보다 이르거나 같으면 다음 날로 넘어간 것으로 본다 (예: 22:00~02:00). 주차 밖(수요일 다음)은 버린다.

import { DAYS, HOURS, slotKey } from './slots';

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const pad = (n) => String(n).padStart(2, '0');
const toHHMM = (hour) => `${pad(hour % 24)}:00`;

// 한 요일의 범위 → 칸 키 목록 (시작은 내림, 끝은 올림해 1시간 칸으로)
export function rangeToSlotKeys({ day, from, to }) {
  const start = toMinutes(from);
  let end = toMinutes(to);
  if (start == null || end == null) return [];
  if (end <= start) end += 24 * 60;
  const keys = [];
  for (let h = Math.floor(start / 60); h < Math.ceil(end / 60); h += 1) {
    const d = day + Math.floor(h / HOURS);
    if (d < DAYS) keys.push(slotKey(d, h % HOURS));
  }
  return keys;
}

export function rangesToSlots(ranges) {
  return Object.fromEntries(ranges.flatMap(rangeToSlotKeys).map((k) => [k, true]));
}

// 칸 → 요일별 범위 (처음 들어올 때 기존 입력 채우기용). 요일마다 연속 구간 하나씩
export function slotsToRanges(slots = {}) {
  const ranges = [];
  for (let day = 0; day < DAYS; day += 1) {
    const hours = Array.from({ length: HOURS }, (_, h) => h).filter((h) => slots[slotKey(day, h)]);
    let i = 0;
    while (i < hours.length) {
      let j = i;
      while (j + 1 < hours.length && hours[j + 1] === hours[j] + 1) j += 1;
      ranges.push({ day, from: toHHMM(hours[i]), to: toHHMM(hours[j] + 1) });
      i = j + 1;
    }
  }
  return ranges;
}

// 주차 + 요일 + 'HH:MM' (KST) → ISO
export function dayTimeToIso(week, day, hhmm) {
  const minutes = toMinutes(hhmm);
  if (minutes == null) return '';
  const [y, m, d] = week.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + day, 0, minutes) - 9 * 3600 * 1000).toISOString();
}
