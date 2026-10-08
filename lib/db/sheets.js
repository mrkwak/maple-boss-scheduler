// Google 스프레드시트 저장소 (ADR-0007). 서버 전용.
// 탭 이름 = 테이블 이름, 첫 행 = 헤더. 컬럼 순서는 헤더 이름으로 맞추므로 시트에서 순서를 바꿔도 된다.

import { decodeRow, encodeRow, tableDef } from './schema';

const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function columnLetter(n) {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

async function serviceAccountToken({ email, privateKey }) {
  const { JWT } = await import('google-auth-library');
  const client = new JWT({ email, key: privateKey, scopes: [SCOPE] });
  const { token } = await client.getAccessToken();
  return token;
}

/**
 * @param {object} p
 * @param {string} p.sheetId
 * @param {() => Promise<string>} [p.getToken] 테스트용 주입
 * @param {typeof fetch} [p.fetchImpl]
 * @param {number} [p.cacheMs] 목록 캐시 시간
 */
export function createSheetsAdapter({
  sheetId = process.env.SHEET_ID,
  getToken,
  fetchImpl = fetch,
  cacheMs = 15000,
} = {}) {
  if (!sheetId) throw new Error('SHEET_ID가 설정되지 않았습니다.');
  const tokenFn =
    getToken ||
    (() =>
      serviceAccountToken({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }));

  const cache = new Map(); // name → { at, header, rows }
  let sheetIds = null; // 탭 이름 → 내부 sheetId (행 삭제용)

  async function call(path, init = {}) {
    const token = await tokenFn();
    const res = await fetchImpl(`${API}/${sheetId}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(`스프레드시트 오류 (${res.status}): ${body?.error?.message || ''}`);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  async function load(name) {
    const hit = cache.get(name);
    if (hit && Date.now() - hit.at < cacheMs) return hit;
    const def = tableDef(name);
    const range = encodeURIComponent(`${name}!A:${columnLetter(Math.max(def.columns.length, 26))}`);
    const body = await call(`/values/${range}?valueRenderOption=UNFORMATTED_VALUE`);
    const [header = [], ...data] = body.values || [];
    const pos = def.columns.map((c) => header.indexOf(c));
    const missing = def.columns.filter((_, i) => pos[i] < 0);
    if (missing.length) throw new Error(`${name} 탭 헤더에 없는 컬럼: ${missing.join(', ')}`);
    const rows = data.map((cells, i) => ({
      sheetRow: i + 2, // 1-based, 헤더 다음 행부터
      value: decodeRow(name, pos.map((p) => cells[p])),
    }));
    const entry = { at: Date.now(), header, rows };
    cache.set(name, entry);
    return entry;
  }

  function toCells(name, header, row) {
    const encoded = encodeRow(name, row);
    const cols = tableDef(name).columns;
    return header.map((h) => {
      const i = cols.indexOf(h);
      return i < 0 ? '' : encoded[i];
    });
  }

  async function sheetIdOf(name) {
    if (!sheetIds) {
      const meta = await call('?fields=sheets.properties(sheetId,title)');
      sheetIds = Object.fromEntries(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
    }
    if (!(name in sheetIds)) throw new Error(`탭 없음: ${name}`);
    return sheetIds[name];
  }

  async function fresh(name) {
    cache.delete(name);
    return load(name);
  }

  return {
    async list(name) {
      const { rows } = await load(name);
      return rows.map((r) => ({ ...r.value }));
    },

    async insert(name, row) {
      const { header, rows } = await fresh(name);
      if (rows.some((r) => r.value.id === row.id)) throw new Error(`${name}: 이미 있는 id ${row.id}`);
      const range = encodeURIComponent(`${name}!A1`);
      await call(`/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        body: JSON.stringify({ values: [toCells(name, header, row)] }),
      });
      cache.delete(name);
      return { ...row };
    },

    async update(name, id, patch) {
      const { header, rows } = await fresh(name);
      const hit = rows.find((r) => r.value.id === id);
      if (!hit) throw new Error(`${name}: id ${id} 없음`);
      const next = { ...hit.value, ...patch, id };
      const range = encodeURIComponent(
        `${name}!A${hit.sheetRow}:${columnLetter(header.length)}${hit.sheetRow}`,
      );
      await call(`/values/${range}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: [toCells(name, header, next)] }),
      });
      cache.delete(name);
      return next;
    },

    async remove(name, id) {
      const { rows } = await fresh(name);
      const hit = rows.find((r) => r.value.id === id);
      if (!hit) return;
      const tabId = await sheetIdOf(name);
      await call(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: { sheetId: tabId, dimension: 'ROWS', startIndex: hit.sheetRow - 1, endIndex: hit.sheetRow },
              },
            },
          ],
        }),
      });
      cache.delete(name);
    },
  };
}

export { columnLetter };
