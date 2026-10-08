'use client';

import { useState } from 'react';
import StepCharacter from './StepCharacter';
import StepBosses from './StepBosses';
import StepSpec from './StepSpec';
import StepHope from './StepHope';
import StepMatch from './StepMatch';

// 이번 주 신청: 캐릭터 → 보스 → 환산 → 희망 시간 → 매칭·확정 → 완료(다음 캐릭터)
export default function Wizard({ me, characters, members, goals, courses, availability, ctx, week, reload, onShowSchedule }) {
  const [step, setStep] = useState(0);
  const [charId, setCharId] = useState(null);
  const [done, setDone] = useState(null); // { name, saved }
  const [doneIds, setDoneIds] = useState([]);
  const character = characters.find((c) => c.id === charId);

  const go = (n) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saved = (n) => async () => {
    await reload();
    go(n);
  };
  const back = (n) => () => go(n);
  const reset = () => {
    setCharId(null);
    setDone(null);
    go(0);
  };

  if (done) {
    const rest = characters.filter((c) => c.memberId === me.id && !doneIds.includes(c.id));
    return (
      <section className="wiz done-box">
        <div className="done-icon" aria-hidden>
          🎉
        </div>
        <h2 className="wiz-title">{done.saved ? `${done.name} 파티 ${done.saved}개 확정!` : `${done.name} 신청 완료`}</h2>
        <p className="wiz-hint">{done.saved ? '일정 탭에서 확인할 수 있어요.' : '같이 갈 사람이 생기면 다시 매칭해 보세요.'}</p>
        <div className="done-actions">
          {rest.length > 0 && (
            <button type="button" className="big primary full" onClick={reset}>
              다음 캐릭터도 신청 ({rest.map((c) => c.name).join(', ')})
            </button>
          )}
          <button type="button" className="big ghost full" onClick={onShowSchedule}>
            일정 보기
          </button>
        </div>
      </section>
    );
  }

  if (step === 0 || !character) {
    return (
      <StepCharacter
        me={me}
        characters={characters}
        ctx={ctx}
        goals={goals}
        courses={courses}
        reload={reload}
        onPicked={(id) => {
          setCharId(id);
          go(1);
        }}
      />
    );
  }

  const common = { character, ctx };
  const finish = async (count) => {
    await reload();
    setDoneIds((ids) => [...new Set([...ids, character.id])]);
    setDone({ name: character.name, saved: count });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (step === 1) {
    return <StepBosses key={character.id} {...common} goals={goals.filter((g) => g.characterId === character.id)} onBack={back(0)} onDone={saved(2)} />;
  }
  // 두 번째 캐릭부터는 희망 시간(사람 단위)이 이미 있으면 건너뜀
  const hasHope = Object.keys(availability.find((a) => a.memberId === me.id)?.slots || {}).length > 0;
  const afterSpec = doneIds.length && hasHope ? 4 : 3;
  if (step === 2) return <StepSpec key={character.id} {...common} onBack={back(1)} onDone={saved(afterSpec)} />;
  if (step === 3) return <StepHope me={me} week={week} availability={availability} onBack={back(2)} onDone={saved(4)} />;
  return (
    <StepMatch
      {...common}
      me={me}
      characters={characters}
      members={members}
      goals={goals}
      courses={courses}
      availability={availability}
      week={week}
      onBack={back(3)}
      onReset={() => finish(0)}
      onFinished={finish}
    />
  );
}
