// 보스 배율 역산 추정 (ADR-0010)
//
// 공개된 설명 기준 보스 배율 = 내 보스 딜 ÷ 보스별 기준값 (섀도어 장인 30분 = 100%).
// 보스 딜은 넥슨 API 스탯으로 근사한다:
//   보스 딜 ≈ 최대 스탯공격력 × (1 + 데미지% + 보공%) / (1 + 데미지%) × 방어율 보정
//   방어율 보정 = max(0, 1 - 보스 방어율 × (1 - 방무))
// [가정] 스탯공격력에 데미지%가 이미 들어 있다고 보고 보공만 더해 줌. 크리티컬·레벨·포스 보정, 헥사 코어, 직업 차이는 반영 안 함.
//
// 보스별 기준값(C)은 "직접 확인한 배율"이 있는 캐릭터로 역산: C = 보스 딜 ÷ (배율 / 100).
// 여러 캐릭터 값이 있으면 중앙값을 쓴다. 같은 보스 기준값이 없으면 추정하지 않는다.

import { defenseOf } from './bosses';

export function defenseFactor(ignoreDefensePct, bossDefensePct) {
  if (bossDefensePct == null || ignoreDefensePct == null) return 1;
  return Math.max(0, 1 - (bossDefensePct / 100) * (1 - ignoreDefensePct / 100));
}

// 보스 딜 근사값. 필요한 스탯이 없으면 null, 방무가 모자라 딜이 안 들어가면 0
export function bossPower(apiStats, key) {
  const s = apiStats || {};
  if (!(s.statAttackMax > 0)) return null;
  const dmg = (s.damage || 0) / 100;
  const boss = (s.bossDamage || 0) / 100;
  const power = s.statAttackMax * ((1 + dmg + boss) / (1 + dmg)) * defenseFactor(s.ignoreDefense, defenseOf(key));
  return Math.max(0, power);
}

function median(xs) {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * 캐릭터들의 직접 입력 배율(bossRates)과 API 스탯으로 보스별 기준값 계산
 * @returns {Record<string, { base: number, samples: number }>}
 */
export function calibrate(characters) {
  const byKey = {};
  for (const c of characters) {
    for (const [key, rate] of Object.entries(c.bossRates || {})) {
      const p = bossPower(c.apiStats, key);
      if (!(p > 0) || !(rate > 0)) continue;
      (byKey[key] ||= []).push(p / (rate / 100));
    }
  }
  return Object.fromEntries(
    Object.entries(byKey).map(([key, bases]) => [key, { base: median(bases), samples: bases.length }]),
  );
}

// 추정 배율(%) 또는 null
export function estimateRate(character, key, calibration) {
  const cal = calibration?.[key];
  const p = bossPower(character?.apiStats, key);
  if (!cal || p == null) return null;
  return (p / cal.base) * 100;
}
