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
    <div className="card">
      <p>나는 누구?</p>
      <div className="chips">
        {members.map((m) => (
          <button key={m.id} onClick={() => onChoose(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
      <form className="row" onSubmit={add} style={{ marginTop: 12 }}>
        <input className="grow" placeholder="처음이면 이름 추가" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary" disabled={busy || !name.trim()}>
          추가
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
