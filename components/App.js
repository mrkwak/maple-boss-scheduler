'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, loadMe, saveMe, loadTab, saveTab } from '@/lib/client';
import { makeRateContext } from '@/lib/rates';
import MemberPicker from './MemberPicker';
import CharacterCard from './CharacterCard';
import RegisterForm from './RegisterForm';
import Board from './Board';
import Schedule from './Schedule';
import Tabs from './Tabs';
import Wizard from './wizard/Wizard';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { id: 'apply', label: '신청', icon: '✍️' },
  { id: 'schedule', label: '이번 주 일정', icon: '🗓️' },
  { id: 'people', label: '캐릭터', icon: '🍁' },
];

export default function App({ week }) {
  const [members, setMembers] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [cuts, setCuts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [courses, setCourses] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [meId, setMeId] = useState(null);
  const [tab, setTab] = useState('apply');
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
      const av = await api('/api/availability');
      setAvailability(av.list);
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
    setTab(TABS.some((t) => t.id === loadTab()) ? loadTab() : 'apply');
    reload();
  }, [reload]);

  const ctx = useMemo(() => makeRateContext({ cuts, characters }), [cuts, characters]);

  const goalsOf = (id) => goals.filter((g) => g.characterId === id);

  const changeTab = (id) => {
    saveTab(id);
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  const choose = (id) => {
    saveMe(id);
    setMeId(id);
  };

  if (members == null) return <main>{error ? <p className="error">{error}</p> : <p className="muted loading">불러오는 중…</p>}</main>;

  const me = members.find((m) => m.id === meId);
  if (!me) {
    return (
      <main>
        <Banner />
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
      <Banner>
        <span className="banner-me">
          <span>
            <strong>{me.name}</strong>님 · {week.slice(5).replace('-', '/')} 주차
          </span>
          <button className="link on-banner" onClick={() => choose(null)}>
            바꾸기
          </button>
        </span>
      </Banner>
      <Tabs tabs={TABS} active={tab} onChange={changeTab} />
      {error && <p className="error">{error}</p>}

      {tab === 'apply' && (
        <Wizard
          me={me}
          characters={characters}
          members={members}
          goals={goals}
          courses={courses}
          availability={availability}
          ctx={ctx}
          week={week}
          reload={reload}
          onShowSchedule={() => changeTab('schedule')}
        />
      )}

      {tab === 'schedule' && (
        <>
          <h2>이번 주 일정</h2>
          <Schedule
            courses={courses}
            characters={characters}
            members={members}
            goals={goals}
            ctx={ctx}
            meId={me.id}
            week={week}
            availability={availability}
            onChanged={reload}
          />
        </>
      )}

      {tab === 'people' && (
        <>
          <h2>내 캐릭터</h2>
          <Board chars={mine} goals={goals} courses={courses} characters={characters} onChanged={reload} />
          <RegisterForm memberId={me.id} onDone={reload} />
          {mine.length === 0 && <p className="muted">등록된 캐릭터가 없습니다.</p>}
          {mine.map((c) => (
            <CharacterCard key={c.id} character={c} ctx={ctx} goals={goalsOf(c.id)} editable onChanged={reload} />
          ))}

          <h2>다른 사람</h2>
          {others.length === 0 && <p className="muted">아직 다른 사람이 없습니다.</p>}
          {others.map(({ member, chars }) => (
            <div key={member.id}>
              <p className="member-name">{member.name}</p>
              {chars.length === 0 && <p className="muted">캐릭터 없음</p>}
              {chars.map((c) => (
                <CharacterCard key={c.id} character={c} ctx={ctx} goals={goalsOf(c.id)} />
              ))}
            </div>
          ))}
        </>
      )}
    </main>
  );
}

function Banner({ children }) {
  return (
    <header className="banner">
      <h1>
        <span aria-hidden>🍁</span> 보스 파티
      </h1>
      <ThemeToggle />
      {children}
    </header>
  );
}
