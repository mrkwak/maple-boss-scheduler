import { createMemoryAdapter } from '@/lib/db/memory';
import {
  createMember, listMembers, registerCharacter, updateSpec, removeCharacter, listCharacters, UserError,
} from '@/lib/services/roster';
import { manualProvider } from '@/lib/spec/provider';

const now = new Date('2026-10-08T00:00:00Z');

function fakeNexon(chars) {
  return {
    async getOcid(name) {
      const c = chars[name];
      if (!c) {
        const e = new Error('nf');
        e.status = 400;
        e.code = 'OPENAPI00004';
        throw e;
      }
      return c.ocid;
    },
    async getBasic(ocid) {
      const c = Object.values(chars).find((x) => x.ocid === ocid);
      return { name: c.name, world: '스카니아', className: '아델', level: 285 };
    },
  };
}

async function setup() {
  const db = createMemoryAdapter();
  const me = await createMember(db, { name: '철수' }, now);
  return { db, me };
}

describe('멤버', () => {
  test('추가·중복·정렬', async () => {
    const { db } = await setup();
    await createMember(db, { name: '가나' });
    await expect(createMember(db, { name: ' 철수 ' })).rejects.toThrow('이미 있는 이름');
    await expect(createMember(db, { name: '' })).rejects.toBeInstanceOf(UserError);
    expect((await listMembers(db)).map((m) => m.name)).toEqual(['가나', '철수']);
  });
});

describe('캐릭터 등록', () => {
  test('넥슨 API로 기본정보 채움, 공급자 조회 불가면 환산 비움', async () => {
    const { db, me } = await setup();
    const nexon = fakeNexon({ 닉: { ocid: 'o1', name: '닉' } });
    const { character, warnings } = await registerCharacter(
      { db, nexon, provider: manualProvider }, { memberId: me.id, name: '닉' }, now,
    );
    expect(character).toMatchObject({ ocid: 'o1', world: '스카니아', className: '아델', level: 285, hexaSpec: null });
    expect(warnings).toEqual([]);
  });

  test('없는 캐릭터·중복·멤버 미선택', async () => {
    const { db, me } = await setup();
    const ctx = { db, nexon: fakeNexon({ 닉: { ocid: 'o1', name: '닉' } }), provider: manualProvider };
    await expect(registerCharacter(ctx, { memberId: me.id, name: '없음' })).rejects.toThrow('찾을 수 없습니다');
    await registerCharacter(ctx, { memberId: me.id, name: '닉' });
    await expect(registerCharacter(ctx, { memberId: me.id, name: '닉' })).rejects.toThrow('이미 등록');
    await expect(registerCharacter(ctx, { memberId: 'x', name: '닉2' })).rejects.toThrow('이름을 선택');
  });

  test('넥슨 키 없으면 닉네임만 등록 + 경고', async () => {
    const { db, me } = await setup();
    const { character, warnings } = await registerCharacter({ db, nexon: null }, { memberId: me.id, name: '닉' });
    expect(character.ocid).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  test('조회 가능한 공급자면 헥사 환산·배율 1회 저장', async () => {
    const { db, me } = await setup();
    const provider = {
      id: 'fake',
      canFetch: true,
      fetchSpec: async () => ({ hexaSpec: 63000, bossRates: { 'swoo:extreme': 50 }, fetchedAt: now }),
    };
    const { character } = await registerCharacter({ db, nexon: null, provider }, { memberId: me.id, name: '닉' }, now);
    expect(character).toMatchObject({ hexaSpec: 63000, bossRates: { 'swoo:extreme': 50 }, specSource: 'fake' });
  });

  test('공급자 조회 실패해도 등록은 됨', async () => {
    const { db, me } = await setup();
    const provider = { id: 'fake', canFetch: true, fetchSpec: async () => { throw new Error('down'); } };
    const { character, warnings } = await registerCharacter({ db, nexon: null, provider }, { memberId: me.id, name: '닉' });
    expect(character.hexaSpec).toBeNull();
    expect(warnings).toContain('환산 조회에 실패했습니다. 직접 입력해 주세요.');
  });
});

test('넥슨 키 오류는 없는 캐릭터와 구분', async () => {
  const { db, me } = await setup();
  const nexon = {
    async getOcid() {
      const e = new Error('bad key');
      e.status = 400;
      e.code = 'OPENAPI00005';
      throw e;
    },
  };
  await expect(registerCharacter({ db, nexon }, { memberId: me.id, name: '닉' })).rejects.toThrow('API 키가 올바르지');
});

describe('환산 입력·삭제', () => {
  test('수동 입력과 오래됨 표시', async () => {
    const { db, me } = await setup();
    const { character } = await registerCharacter({ db, nexon: null }, { memberId: me.id, name: '닉' });
    const updated = await updateSpec(db, character.id, { hexaSpec: '63,000', bossRates: { 'swoo:extreme': '50%' } }, now);
    expect(updated).toMatchObject({ hexaSpec: 63000, bossRates: { 'swoo:extreme': 50 }, specSource: 'manual', specStale: false });
    const later = await listCharacters(db, new Date('2026-10-30T00:00:00Z'));
    expect(later[0].specStale).toBe(true);
    await expect(updateSpec(db, character.id, { hexaSpec: '-1' })).rejects.toBeInstanceOf(UserError);
  });

  test('삭제 시 목표·코스 배정도 지움', async () => {
    const { db, me } = await setup();
    const { character } = await registerCharacter({ db, nexon: null }, { memberId: me.id, name: '닉' });
    await db.insert('goals', { id: 'g1', character_id: character.id, period: '2026-10-08', boss_key: 'swoo:extreme' });
    await db.insert('course_members', { id: 'c1:x', course_id: 'c1', character_id: character.id });
    await removeCharacter(db, character.id);
    expect(await db.list('characters')).toEqual([]);
    expect(await db.list('goals')).toEqual([]);
    expect(await db.list('course_members')).toEqual([]);
  });
});
