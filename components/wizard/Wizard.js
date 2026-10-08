'use client';

import { useState } from 'react';
import StepCharacter from './StepCharacter';
import StepBosses from './StepBosses';
import StepSpec from './StepSpec';
import StepHope from './StepHope';
import StepMatch from './StepMatch';

// 이번 주 신청: 캐릭터 → 보스 → 환산 → 희망 시간 → 매칭·확정
export default function Wizard({ me, characters, members, goals, courses, availability, ctx, week, reload, onFinished }) {
  const [step, setStep] = useState(0);
  const [charId, setCharId] = useState(null);
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
    go(0);
  };

  if (step === 0 || !character) {
    return (
      <StepCharacter
        me={me}
        characters={characters}
        ctx={ctx}
        reload={reload}
        onPicked={(id) => {
          setCharId(id);
          go(1);
        }}
      />
    );
  }

  const common = { character, ctx };
  if (step === 1) {
    return <StepBosses key={character.id} {...common} goals={goals.filter((g) => g.characterId === character.id)} onBack={back(0)} onDone={saved(2)} />;
  }
  if (step === 2) return <StepSpec key={character.id} {...common} onBack={back(1)} onDone={saved(3)} />;
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
      onReset={reset}
      onFinished={async () => {
        await reload();
        reset();
        onFinished();
      }}
    />
  );
}
