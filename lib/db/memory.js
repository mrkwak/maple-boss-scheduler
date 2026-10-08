// 메모리 저장소 (개발·테스트용). 시트 어댑터와 같은 인터페이스.

import { tableDef } from './schema';

export function createMemoryAdapter(seed = {}) {
  const tables = {};
  const rowsOf = (name) => {
    tableDef(name);
    if (!tables[name]) tables[name] = (seed[name] || []).map((r) => ({ ...r }));
    return tables[name];
  };

  return {
    async list(name) {
      return rowsOf(name).map((r) => ({ ...r }));
    },
    async insert(name, row) {
      const rows = rowsOf(name);
      if (rows.some((r) => r.id === row.id)) throw new Error(`${name}: 이미 있는 id ${row.id}`);
      rows.push({ ...row });
      return { ...row };
    },
    async update(name, id, patch) {
      const rows = rowsOf(name);
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new Error(`${name}: id ${id} 없음`);
      rows[i] = { ...rows[i], ...patch, id };
      return { ...rows[i] };
    },
    async remove(name, id) {
      const rows = rowsOf(name);
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows.splice(i, 1);
    },
  };
}
