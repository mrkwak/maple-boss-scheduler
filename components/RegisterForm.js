'use client';

import { useState } from 'react';
import { api } from '@/lib/client';

export default function RegisterForm({ memberId, onDone }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ error: '', warn: '' });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage({ error: '', warn: '' });
    try {
      const { warnings } = await api('/api/characters', { method: 'POST', body: { memberId, name } });
      setName('');
      setMessage({ error: '', warn: warnings?.join(' ') || '' });
      await onDone();
    } catch (err) {
      setMessage({ error: err.message, warn: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="row">
        <input className="grow" placeholder="캐릭터 닉네임" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary" disabled={busy || !name.trim()}>
          {busy ? '등록 중…' : '등록'}
        </button>
      </div>
      {message.error && <p className="error">{message.error}</p>}
      {message.warn && <p className="muted">{message.warn}</p>}
    </form>
  );
}
