'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { BOSSES, bossKey, bossLabel } from '@/lib/bosses';

const BOSS_KEYS = BOSSES.flatMap((b) => [...b.difficulties].reverse().map((d) => bossKey(b.id, d)));

export default function SpecForm({ character, onCancel, onSaved }) {
  const [hexaSpec, setHexaSpec] = useState(character.hexaSpec ?? '');
  const [rates, setRates] = useState(
    Object.entries(character.bossRates || {}).map(([key, value]) => ({ key, value: String(value) })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const html = await file.text();
      await api(`/api/characters/${character.id}/import`, { method: 'POST', body: { html } });
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setRate = (i, patch) => setRates(rates.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const used = new Set(rates.map((r) => r.key));
  const nextKey = BOSS_KEYS.find((k) => !used.has(k));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const bossRates = Object.fromEntries(rates.filter((r) => r.value !== '').map((r) => [r.key, r.value]));
      await api(`/api/characters/${character.id}`, { method: 'PATCH', body: { hexaSpec, bossRates } });
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} style={{ marginTop: 8 }}>
      <label className="filepick">
        <span>환산주스탯 저장 파일로 가져오기</span>
        <input type="file" accept=".html,.htm,text/html" onChange={importFile} disabled={busy} />
      </label>
      <p className="muted" style={{ marginTop: 4 }}>
        환산주스탯에서 이 캐릭터의 효율·보스컷 페이지를 열고 Ctrl+S(다른 이름으로 저장)한 파일을 고르세요. 헥사환산과 보스 배율이 한 번에 들어갑니다.
      </p>
      <div className="row">
        <label className="grow">
          <span className="muted">헥사 환산</span>
          <input
            inputMode="numeric"
            style={{ width: '100%' }}
            placeholder="예: 63000"
            value={hexaSpec}
            onChange={(e) => setHexaSpec(e.target.value)}
          />
        </label>
      </div>
      <p className="muted" style={{ marginBottom: 4 }}>
        보스 배율 (선택 — 비우면 컷표로 계산)
      </p>
      {rates.map((r, i) => (
        <div className="row" key={i} style={{ marginBottom: 6 }}>
          <select className="grow" value={r.key} onChange={(e) => setRate(i, { key: e.target.value })}>
            {BOSS_KEYS.filter((k) => k === r.key || !used.has(k)).map((k) => (
              <option key={k} value={k}>
                {bossLabel(k)}
              </option>
            ))}
          </select>
          <input
            inputMode="decimal"
            style={{ width: 90 }}
            placeholder="%"
            value={r.value}
            onChange={(e) => setRate(i, { value: e.target.value })}
          />
          <button type="button" onClick={() => setRates(rates.filter((_, j) => j !== i))}>
            빼기
          </button>
        </div>
      ))}
      <div className="row" style={{ marginTop: 8 }}>
        {nextKey && (
          <button type="button" onClick={() => setRates([...rates, { key: nextKey, value: '' }])}>
            배율 추가
          </button>
        )}
        <span className="grow" />
        <button type="button" onClick={onCancel}>
          취소
        </button>
        <button className="primary" disabled={busy}>
          저장
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
