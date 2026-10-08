'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, loadMe, saveMe } from '@/lib/client';
import { makeRateContext } from '@/lib/rates';
import MemberPicker from './MemberPicker';
import CharacterCard from './CharacterCard';
import RegisterForm from './RegisterForm';
import BossRanking from './BossRanking';
import Courses from './Courses';

export default function App({ week, month }) {
  const [members, setMembers] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [cuts, setCuts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [courses, setCourses] = useState([]);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [m, c, k, g, co] = await Promise.all([
        api('/api/members'),
        api('/api/characters'),
        api('/api/cuts'),
        api('/api/goals'),
        api('/api/courses'),
      ]);
      setCourses(co.courses);
      setMembers(m.members);
      setCharacters(c.characters);
      setCuts(k.cuts);
      setGoals(g.goals);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    setMeId(loadMe());
    reload();
  }, [reload]);

  const ctx = useMemo(() => makeRateContext({ cuts, characters }), [cuts, characters]);

  const goalsOf = (id) => goals.filter((g) => g.characterId === id);

  const choose = (id) => {
    saveMe(id);
    setMeId(id);
  };

  if (members == null) return <main>{error ? <p className="error">{error}</p> : <p className="muted">불러오는 중…</p>}</main>;

  const me = members.find((m) => m.id === meId);
  if (!me) {
    return (
      <main>
        <h1>보스 파티</h1>
        <MemberPicker members={members} onChoose={choose} onCreated={reload} />
      </main>
    );
  }

  const mine = characters.filter((c) => c.memberId === me.id);
  const others = members
    .filter((m) => m.id !== me.id)
    .map((m) => ({ member: m, chars: characters.filter((c) => c.memberId === m.id) }));

  return (
    <main>
      <div className="top">
        <h1>보스 파티</h1>
        <div className="row muted">
          <span>
            {me.name} · 주차 {week} · {month}
          </span>
          <button className="link" onClick={() => choose(null)}>
            바꾸기
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <h2>이번 주 코스</h2>
      <Courses
        courses={courses}
        characters={characters}
        members={members}
        goals={goals}
        ctx={ctx}
        meId={me.id}
        onChanged={reload}
      />

      <h2>내 캐릭터</h2>
      <RegisterForm memberId={me.id} onDone={reload} />
      {mine.length === 0 && <p className="muted">등록된 캐릭터가 없습니다.</p>}
      {mine.map((c) => (
        <CharacterCard key={c.id} character={c} ctx={ctx} goals={goalsOf(c.id)} editable onChanged={reload} />
      ))}

      <h2>보스 배율 순위</h2>
      <BossRanking characters={characters} members={members} meId={me.id} ctx={ctx} />

      <h2>다른 사람</h2>
      {others.length === 0 && <p className="muted">아직 다른 사람이 없습니다.</p>}
      {others.map(({ member, chars }) => (
        <div key={member.id}>
          <p className="muted">{member.name}</p>
          {chars.length === 0 && <p className="muted">캐릭터 없음</p>}
          {chars.map((c) => (
            <CharacterCard key={c.id} character={c} ctx={ctx} goals={goalsOf(c.id)} />
          ))}
        </div>
      ))}
    </main>
  );
}
