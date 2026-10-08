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
