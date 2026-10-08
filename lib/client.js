// 브라우저에서 API 호출

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

const ME_KEY = 'mbs_member';

export function loadMe() {
  try {
    return localStorage.getItem(ME_KEY);
  } catch {
    return null;
  }
}

export function saveMe(id) {
  try {
    if (id) localStorage.setItem(ME_KEY, id);
    else localStorage.removeItem(ME_KEY);
  } catch {
    // 저장 못 해도 이번 화면에서는 동작
  }
}

export function formatSpec(n) {
  return n == null ? '-' : Number(n).toLocaleString('ko-KR');
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' });
}

// '2026-10-10T12:00:00Z' → '10/10(토) 21:00' (KST)
export function formatWhen(iso) {
  if (!iso) return '시간 미정';
  const d = new Date(iso);
  const day = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' });
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
  return `${day} ${time}`;
}

// ISO → <input type="datetime-local"> 값 (KST)
export function toLocalInput(iso) {
  if (!iso) return '';
  const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return k.toISOString().slice(0, 16);
}

// <input type="datetime-local"> 값(KST) → ISO
export function fromLocalInput(v) {
  if (!v) return '';
  return new Date(`${v}:00+09:00`).toISOString();
}
