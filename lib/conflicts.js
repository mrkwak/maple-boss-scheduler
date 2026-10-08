// 같은 사람이 비슷한 시간에 서로 다른 캐릭터로 파티에 들어간 경우 (한 사람이 두 캐릭을 동시에 못 함)
// 같은 캐릭터가 같은 시간 여러 파티에 있는 건 보스를 이어서 가는 것이라 괜찮다.
// "비슷한 시간" = 시작 시각 차이가 GAP_HOURS 미만 [가정 — 보스 한 묶음을 2시간 안쪽으로 봄]

export const GAP_HOURS = 2;

const active = (courses) => courses.filter((c) => c.status !== 'canceled' && c.startAt);

/**
 * @param {object[]} courses { id, startAt, status, characterIds }
 * @param {object[]} characters { id, memberId, name }
 * @returns {{ memberId: string, a: object, b: object, names: string[] }[]} 겹치는 코스 쌍
 */
export function findTimeConflicts(courses, characters, gapHours = GAP_HOURS) {
  const ownerOf = new Map(characters.map((c) => [c.id, c]));
  const list = active(courses);
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      if (Math.abs(new Date(a.startAt) - new Date(b.startAt)) >= gapHours * 3600 * 1000) continue;
      for (const ca of a.characterIds) {
        for (const cb of b.characterIds) {
          const x = ownerOf.get(ca);
          const y = ownerOf.get(cb);
          if (x && y && ca !== cb && x.memberId === y.memberId) {
            out.push({ memberId: x.memberId, a, b, names: [x.name, y.name] });
          }
        }
      }
    }
  }
  return out;
}

// 코스 id → 그 코스가 걸린 겹침 목록
export function conflictsByCourse(conflicts) {
  const map = {};
  for (const c of conflicts) {
    (map[c.a.id] ||= []).push(c);
    (map[c.b.id] ||= []).push(c);
  }
  return map;
}
