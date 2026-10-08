'use client';

import { useState } from 'react';
import { api, formatWhen } from '@/lib/client';
import { buildBoard, CELL } from '@/lib/board';
import { conflictsByCourse, findTimeConflicts } from '@/lib/conflicts';
import BossName from './BossName';

// '토 21:00' (KST)
const shortWhen = (iso) =>
  new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

const CELL_TEXT = { [CELL.GOAL]: '미정', [CELL.PARTY]: '확정', [CELL.CLEARED]: '클리어' };

// 내 캐릭터 현황판: 캐릭터 × 보스, 전체 지난주 복사, 시간 겹침 경고
export default function Board({ chars, goals, courses, characters, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const board = buildBoard(chars, goals, courses);
  const conflicts = conflictsByCourse(findTimeConflicts(courses, characters));
  const myConflicts = [...new Set(Object.values(conflicts).flat().filter((c) => chars.some((x) => x.memberId === c.memberId)).map((c) => c.names.join('·')))];

  // 캐릭마다 지난주 목표 복사. 이미 있거나 지난주가 없으면 건너뜀
  const copyAll = async () => {
    setBusy(true);
    setMessage('');
    const result = { copied: [], skipped: [] };
    for (const c of chars) {
      try {
        await api(`/api/goals/${c.id}/copy`, { method: 'POST' });
        result.copied.push(c.name);
      } catch (e) {
        result.skipped.push(`${c.name}(${e.message})`);
      }
    }
    await onChanged();
    setMessage([result.copied.length && `복사: ${result.copied.join(', ')}`, result.skipped.length && `건너뜀: ${result.skipped.join(', ')}`].filter(Boolean).join(' / '));
    setBusy(false);
  };

  if (!chars.length) return null;

  return (
    <div className="card board">
      <div className="row">
        <strong className="grow">이번 주 현황</strong>
        <button type="button" onClick={copyAll} disabled={busy}>
          {busy ? '복사 중…' : '전체 지난주 복사'}
        </button>
      </div>
      {message && <p className="muted">{message}</p>}
      {myConflicts.length > 0 && <p className="warn-box">⚠️ 같은 시간대에 내 캐릭 둘이 들어가 있어요: {myConflicts.join(', ')}</p>}
      {board.bossKeys.length === 0 ? (
        <p className="muted">이번 주 목표가 없어요. 신청 탭에서 보스를 골라 주세요.</p>
      ) : (
        <div className="board-scroll">
          <table className="board-table">
            <thead>
              <tr>
                <th />
                {chars.map((c) => (
                  <th key={c.id}>{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.bossKeys.map((k) => (
                <tr key={k}>
                  <th>
                    <BossName bossKey={k} />
                  </th>
                  {chars.map((c) => {
                    const cell = board.cells[c.id][k];
                    return (
                      <td key={c.id} className={cell ? `cell-${cell.state}` : ''} title={cell?.course?.startAt ? formatWhen(cell.course.startAt) : undefined}>
                        {cell ? CELL_TEXT[cell.state] : ''}
                        {cell?.state === CELL.PARTY && cell.course.startAt && <small>{shortWhen(cell.course.startAt)}</small>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
