// 코스 규칙 검사 (ADR-0004)

import { bossLabel, bossLevelOf, maxPartyOf } from './bosses';

/**
 * @param {object} p
 * @param {object[]} p.members 코스에 넣을 캐릭터들 ({ id, memberId })
 * @param {string[]} p.stepKeys 코스 보스 키
 * @param {Record<string, string[]>} p.assignedByCharacter 같은 기간 다른 코스에 배정된 보스 키
 * @param {boolean} p.allowSameMember 같은 사람 캐릭 여러 개 허용 여부 (기본 차단, 사용자 확인 필요)
 * @returns {{ code: string, message: string }[]} 위반 목록 (비면 통과)
 */
export function validateCourse({ members, stepKeys, assignedByCharacter = {}, allowSameMember = false }) {
  const errors = [];

  if (!allowSameMember) {
    const seen = new Set();
    for (const m of members) {
      if (seen.has(m.memberId)) {
        errors.push({ code: 'same_member', message: '같은 사람의 캐릭터가 둘 이상 있습니다.' });
        break;
      }
      seen.add(m.memberId);
    }
  }

  const caps = stepKeys.map(maxPartyOf).filter((n) => n != null);
  if (caps.length && members.length > Math.min(...caps)) {
    errors.push({ code: 'over_capacity', message: `코스 최대 인원(${Math.min(...caps)}명)을 넘었습니다.` });
  }

  for (const m of members) {
    const assigned = new Set(assignedByCharacter[m.id] || []);
    const dup = stepKeys.filter((k) => assigned.has(k));
    if (dup.length) {
      errors.push({ code: 'duplicate_boss', message: `${m.name || m.id}: 이미 다른 코스에 배정된 보스가 있습니다.` });
    }
  }

  for (const m of members) {
    const blocked = stepKeys.filter((k) => m.level > 0 && bossLevelOf(k) > m.level);
    if (blocked.length) {
      errors.push({ code: 'level', message: `${m.name || m.id}: 레벨 부족으로 ${blocked.map(bossLabel).join(', ')} 입장 불가입니다.` });
    }
  }

  return errors;
}
