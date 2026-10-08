// 모집 파티 상태와 합류 후보 (ADR-0013). 상태는 저장하지 않고 인원·시간으로 계산
// recruiting = 목표 인원 미달, needTime = 다 찼는데 시간 없음, fixed = 다 차고 시간 있음

export const PARTY = { RECRUITING: 'recruiting', NEED_TIME: 'needTime', FIXED: 'fixed' };

export function partyState(course) {
  if (course.partySize && course.characterIds.length < course.partySize) return PARTY.RECRUITING;
  return course.startAt ? PARTY.FIXED : PARTY.NEED_TIME;
}

function overlap(a = {}, b = {}) {
  return Object.keys(a).filter((k) => a[k] && b[k]).length;
}

/**
 * 이 보스·이 인원으로 모집 중이고 내가 들어갈 수 있는 파티 (희망 시간이 많이 겹치는 순)
 * @param {object} p
 * @param {object[]} p.courses
 * @param {string} p.bossKey
 * @param {number} p.size
 * @param {object} p.me 내 캐릭터 { id, memberId }
 * @param {object[]} p.characters
 * @param {Record<string, object>} p.slotsByMember 멤버 id → 희망 시간 칸
 * @returns {{ course: object, overlap: number }[]}
 */
export function openParties({ courses, bossKey, size, me, characters, slotsByMember = {} }) {
  const memberOf = (id) => characters.find((c) => c.id === id)?.memberId;
  return courses
    .filter(
      (c) =>
        c.status !== 'canceled' &&
        c.partySize === size &&
        partyState(c) === PARTY.RECRUITING &&
        c.steps.length === 1 &&
        c.steps[0].bossKey === bossKey &&
        !c.characterIds.some((id) => memberOf(id) === me.memberId),
    )
    .map((course) => {
      const members = [...new Set(course.characterIds.map(memberOf))];
      const score = members.reduce((s, m) => s + overlap(slotsByMember[me.memberId], slotsByMember[m]), 0);
      return { course, overlap: score };
    })
    .sort((a, b) => b.overlap - a.overlap || a.course.characterIds.length - b.course.characterIds.length);
}
