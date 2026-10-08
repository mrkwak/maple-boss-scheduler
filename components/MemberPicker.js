'use client';

import { useState } from 'react';
import { api } from '@/lib/client';

export default function MemberPicker({ members, onChoose, onCreated }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { member } = await api('/api/members', { method: 'POST', body: { name } });
      await onCreated();
      onChoose(member.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card who">
      <h2 className="wiz-title">나는 누구?</h2>
      <p className="wiz-hint">내 이름을 누르세요. 다음부터는 기억해요.</p>
      <div className="who-list">
        {members.map((m) => (
          <button key={m.id} className="who-btn" onClick={() => onChoose(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
      <form className="row" onSubmit={add} style={{ marginTop: 12 }}>
        <input className="grow big-input" placeholder="처음이면 이름 추가" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="big primary" disabled={busy || !name.trim()}>
          추가
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
