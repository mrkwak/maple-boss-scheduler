import { createNexonClient, NexonApiError } from '@/lib/nexon';

function fakeFetch(map) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const path = new URL(url).pathname;
    const [status, body] = map[path] || [404, {}];
    return { ok: status < 400, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

test('ocid 조회 후 기본정보', async () => {
  const fetchImpl = fakeFetch({
    '/maplestory/v1/id': [200, { ocid: 'abc' }],
    '/maplestory/v1/character/basic': [200, { character_name: '닉', world_name: '스카니아', character_class: '아델', character_level: 285 }],
  });
  const api = createNexonClient({ apiKey: 'k', fetchImpl });
  expect(await api.getOcid('닉')).toBe('abc');
  expect(await api.getBasic('abc')).toMatchObject({ name: '닉', world: '스카니아', className: '아델', level: 285 });
  expect(fetchImpl.calls[0].init.headers['x-nxopen-api-key']).toBe('k');
});

test('오류 응답은 NexonApiError + 오류 코드', async () => {
  const api = createNexonClient({
    apiKey: 'k',
    fetchImpl: fakeFetch({ '/maplestory/v1/id': [400, { error: { name: 'OPENAPI00004', message: 'Please input valid parameter' } }] }),
  });
  const err = await api.getOcid('x').catch((e) => e);
  expect(err).toBeInstanceOf(NexonApiError);
  expect(err.code).toBe('OPENAPI00004');
});

test('키가 없으면 호출하지 않음', async () => {
  const fetchImpl = fakeFetch({});
  const api = createNexonClient({ apiKey: '', fetchImpl });
  await expect(api.getOcid('x')).rejects.toThrow('NEXON_API_KEY');
  expect(fetchImpl.calls).toHaveLength(0);
});
