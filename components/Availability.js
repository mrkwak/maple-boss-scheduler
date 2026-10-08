'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { heat } from '@/lib/slots';
import AvailabilityGrid from './AvailabilityGrid';

// 이번 주 가능 시간: 전체 히트맵 + 내 시간 입력
export default function Availability({ week, list, members, meId, onChanged }) {
  const mine = list.find((a) => a.memberId === meId);
  const [editing, setEditing] = useState(false);
  const [slots, setSlots] = useState(mine?.slots || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const filled = list.filter((a) => Object.keys(a.slots).length > 0);
  const counts = heat(filled.map((a) => a.slots));
  const nameOf = (id) => members.find((m) => m.id === id)?.name || '';

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      await api('/api/availability', { method: 'PUT', body: { memberId: meId, week, slots } });
      setEditing(false);
    });
  const copy = () =>
    run(async () => {
      const { availability } = await api('/api/availability/copy', { method: 'POST', body: { memberId: meId, week } });
      setSlots(availability.slots);
    });

  return (
    <div className="card">
      {editing ? (
        <>
          <p className="muted">가능한 시간을 누르거나 끌어서 칠하세요. (목~수, 한국 시간)</p>
          <AvailabilityGrid week={week} slots={slots} onChange={setSlots} editable />
          <div className="row" style={{ marginTop: 8 }}>
            <button onClick={copy} disabled={busy}>
              지난주 복사
            </button>
            <button onClick={() => setSlots({})} disabled={busy}>
              전부 지우기
            </button>
            <span className="grow" />
            <button
              onClick={() => {
                setSlots(mine?.slots || {});
                setEditing(false);
              }}
              disabled={busy}
            >
              취소
            </button>
            <button className="primary" onClick={save} disabled={busy}>
              저장
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="row">
            <span className="grow muted">
              입력한 사람 {filled.length}/{members.length}명
              {filled.length > 0 && ` · ${filled.map((a) => nameOf(a.memberId)).join(', ')}`}
            </span>
            <button
              className="primary"
              onClick={() => {
                setSlots(mine?.slots || {});
                setEditing(true);
              }}
            >
              내 시간 입력
            </button>
          </div>
          {filled.length > 0 && (
            <>
              <p className="muted">칸 숫자 = 가능한 사람 수, 진한 초록 = 모두 가능</p>
              <AvailabilityGrid week={week} counts={counts} total={filled.length} />
            </>
          )}
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
