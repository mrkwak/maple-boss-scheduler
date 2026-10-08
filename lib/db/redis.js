// Redis 저장소 (Upstash REST, ADR-0011). 서버 전용.
// 테이블마다 해시 하나: 키 `mbs:<테이블>`, 필드 = id, 값 = 행 JSON.
// Vercel 대시보드에서 Upstash Redis를 프로젝트에 연결하면 KV_REST_API_URL/TOKEN이 자동으로 들어온다.

import { tableDef } from './schema';

const PREFIX = 'mbs:';

export function redisEnv(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * @param {object} p
 * @param {string} p.url Upstash REST 주소
 * @param {string} p.token
 * @param {typeof fetch} [p.fetchImpl]
 */
export function createRedisAdapter({ url, token, fetchImpl = fetch } = redisEnv() || {}) {
  if (!url || !token) throw new Error('Redis 접속 정보(KV_REST_API_URL/TOKEN)가 없습니다.');

  async function cmd(...args) {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.error) throw new Error(`Redis 오류 (${res.status}): ${body?.error || ''}`);
    return body.result;
  }

  const keyOf = (name) => {
    tableDef(name);
    return PREFIX + name;
  };

  return {
    async list(name) {
      const flat = (await cmd('HGETALL', keyOf(name))) || [];
      const rows = [];
      for (let i = 1; i < flat.length; i += 2) rows.push(JSON.parse(flat[i]));
      return rows;
    },
    async insert(name, row) {
      const added = await cmd('HSETNX', keyOf(name), row.id, JSON.stringify(row));
      if (!added) throw new Error(`${name}: 이미 있는 id ${row.id}`);
      return { ...row };
    },
    async update(name, id, patch) {
      const raw = await cmd('HGET', keyOf(name), id);
      if (raw == null) throw new Error(`${name}: id ${id} 없음`);
      const next = { ...JSON.parse(raw), ...patch, id };
      await cmd('HSET', keyOf(name), id, JSON.stringify(next));
      return next;
    },
    async remove(name, id) {
      await cmd('HDEL', keyOf(name), id);
    },
  };
}
