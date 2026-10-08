'use client';

import { useState } from 'react';
import { api, formatDate, formatSpec } from '@/lib/client';
import { hexaOf } from '@/lib/rates';
import Shell from './Shell';

// 3단계: 헥사 환산 확인, 다르면 수정 (숫자 또는 환산주스탯 저장 파일)
export default function StepSpec({ character: c, ctx, onBack, onDone }) {
  const hexa = hexaOf(c, ctx);
  const [editing, setEditing] = useState(!hexa);
  const [value, setValue] = useState(c.hexaSpec ?? (hexa ? Math.round(hexa.value) : ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const save = () =>
    run(() => api(`/api/characters/${c.id}`, { method: 'PATCH', body: { hexaSpec: value, bossRates: c.bossRates } }));

  const importFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    run(async () => {
      const html = await file.text();
      await api(`/api/characters/${c.id}/import`, { method: 'POST', body: { html } });
    });
  };

  const next = editing
    ? { label: '저장하고 다음', onClick: save, disabled: !(Number(value) > 0), busy }
    : { label: '맞아요 · 다음', onClick: onDone, busy };

  return (
    <Shell step={2} title="헥사 환산이 맞나요?" hint="파티 배율 계산에 쓰여요. 다르면 고쳐 주세요." error={error} onBack={onBack} next={next}>
      {!editing ? (
        <div className="spec-box">
          <span className="muted">{c.name} 헥사 환산</span>
          <strong className="spec-big">
            {hexa.source === 'estimate' && <small>약 </small>}
            {formatSpec(Math.round(hexa.value))}
          </strong>
          <span className="muted">
            {hexa.source === 'estimate'
              ? '넥슨 스탯으로 추정한 값이에요'
              : c.specUpdatedAt
                ? `${formatDate(c.specUpdatedAt)} 입력`
                : '직접 입력한 값'}
            {c.specStale && ' · 오래됨'}
          </span>
          <button type="button" className="big ghost" onClick={() => setEditing(true)}>
            아니요, 수정할게요
          </button>
        </div>
      ) : (
        <div className="spec-box">
          <label className="label" htmlFor="hexa">
            헥사 환산 (380)
          </label>
          <input
            id="hexa"
            className="big-input center"
            inputMode="numeric"
            placeholder="예: 69452"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))}
          />
          <label className="filepick">
            <span>또는 환산주스탯 저장 파일로 가져오기</span>
            <input type="file" accept=".html,.htm,text/html" onChange={importFile} disabled={busy} />
          </label>
          <p className="muted">환산주스탯에서 효율·보스컷 페이지를 열고 Ctrl+S로 저장한 파일을 고르면 보스 배율까지 한 번에 들어가요.</p>
        </div>
      )}
    </Shell>
  );
}
