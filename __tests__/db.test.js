import { createMemoryAdapter } from '@/lib/db/memory';
import { createSheetsAdapter, columnLetter } from '@/lib/db/sheets';
import { decodeRow, encodeRow } from '@/lib/db/schema';

describe('schema 변환', () => {
  test('json·number·boolean 왕복', () => {
    const row = { id: 's1', course_id: 'c1', step_index: 2, boss_key: 'swoo:extreme', cleared: true };
    expect(decodeRow('course_steps', encodeRow('course_steps', row))).toEqual(row);
    const ch = decodeRow('characters', ['c1', 'm1', 'o', '닉', '', '', 285, 63000, '{"swoo:extreme":52}']);
    expect(ch.level).toBe(285);
    expect(ch.boss_rates).toEqual({ 'swoo:extreme': 52 });
    expect(ch.world).toBe('');
  });
  test('깨진 JSON은 null', () => {
    expect(decodeRow('availability', ['a', 'm', 'w', '{bad'])).toMatchObject({ slots: null });
  });
});

describe('메모리 저장소', () => {
  test('CRUD', async () => {
    const db = createMemoryAdapter();
    await db.insert('members', { id: 'm1', name: 'A' });
    await expect(db.insert('members', { id: 'm1', name: 'B' })).rejects.toThrow();
    await db.update('members', 'm1', { name: 'AA' });
    expect(await db.list('members')).toEqual([{ id: 'm1', name: 'AA' }]);
    await db.remove('members', 'm1');
    expect(await db.list('members')).toEqual([]);
  });
});

describe('스프레드시트 저장소', () => {
  test('columnLetter', () => {
    expect(columnLetter(1)).toBe('A');
    expect(columnLetter(26)).toBe('Z');
    expect(columnLetter(27)).toBe('AA');
  });

  function fakeSheets(values) {
    const calls = [];
    const fetchImpl = async (url, init = {}) => {
      calls.push({ url: decodeURIComponent(url), method: init.method || 'GET', body: init.body && JSON.parse(init.body) });
      let body = {};
      if (url.includes('fields=sheets')) body = { sheets: [{ properties: { title: 'members', sheetId: 7 } }] };
      else if (!init.method) body = { values };
      return { ok: true, status: 200, json: async () => body };
    };
    return { fetchImpl, calls };
  }

  // 헤더 순서가 스키마와 달라도 이름으로 맞춘다
  const values = [
    ['name', 'id', 'memo', 'created_at'],
    ['철수', 'm1', '', ''],
    ['영희', 'm2', '메모', ''],
  ];

  const make = (f) => createSheetsAdapter({ sheetId: 'S', getToken: async () => 't', fetchImpl: f.fetchImpl, cacheMs: 0 });

  test('목록은 헤더 이름 기준으로 읽음', async () => {
    const f = fakeSheets(values);
    expect(await make(f).list('members')).toEqual([
      { id: 'm1', name: '철수', memo: '', created_at: '' },
      { id: 'm2', name: '영희', memo: '메모', created_at: '' },
    ]);
  });

  test('추가는 헤더 순서로 append', async () => {
    const f = fakeSheets(values);
    await make(f).insert('members', { id: 'm3', name: '민수' });
    const post = f.calls.find((c) => c.method === 'POST');
    expect(post.url).toContain('members!A1:append');
    expect(post.body.values).toEqual([['민수', 'm3', '', '']]);
  });

  test('수정은 해당 행만 PUT', async () => {
    const f = fakeSheets(values);
    await make(f).update('members', 'm2', { memo: '바뀜' });
    const put = f.calls.find((c) => c.method === 'PUT');
    expect(put.url).toContain('members!A3:D3');
    expect(put.body.values).toEqual([['영희', 'm2', '바뀜', '']]);
  });

  test('삭제는 deleteDimension', async () => {
    const f = fakeSheets(values);
    await make(f).remove('members', 'm1');
    const req = f.calls.find((c) => c.url.includes(':batchUpdate')).body.requests[0].deleteDimension.range;
    expect(req).toEqual({ sheetId: 7, dimension: 'ROWS', startIndex: 1, endIndex: 2 });
  });

  test('헤더에 컬럼이 없으면 오류', async () => {
    const f = fakeSheets([['id', 'name']]);
    await expect(make(f).list('members')).rejects.toThrow('memo');
  });
});
