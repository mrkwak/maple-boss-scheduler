// 헥사환산·보스 배율 역산 추정 (ADR-0010)
//
// 구조 (maplescouter 보스컷 화면 관찰, 2026-10-08):
//   보스 배율(%) = 그 보스 조건의 내 헥사환산 ÷ 보스별 100% 기준 헥사환산 × 100
//   예) 헥사환산 69,452 · 89.94% → 기준 약 77,220
//
// 이 앱의 역산
//   1. 보스별 기준값 = 직접 입력한 헥사환산 ÷ (직접 입력한 배율/100), 여러 캐릭터면 중앙값
//   2. 헥사환산 추정 = k × 보스 딜 근사(넥슨 API 스탯, 방어율 380% 기준)
//      k = 직접 입력한 헥사환산 ÷ 보스 딜 근사, 여러 캐릭터면 중앙값
//   보스 딜 근사 = 최대 스탯공격력 × (1 + 데미지% + 보공%) / (1 + 데미지%) × max(0, 1 − 방어율 × (1 − 방무))
//
//   3. 직업 보정 = 같은 직업 캐릭터의 (직접 배율 × 보스 기준값 ÷ 헥사환산) 중앙값.
//      2026-10-08 확인: 같은 보스라도 렌선남아(렌)의 기준값이 집사0(아란)보다 약 11~15% 낮음 → 직업 체급 차이로 봄
//      보정값이 없는 직업은 1 (기준 직업과 같다고 가정)
//
// [가정·미반영] 스탯공격력에 데미지%가 들어 있다고 봄, 심볼·포스·레벨 손실(S/F/LV), 도핑, 크리티컬

export const REFERENCE_DEFENSE = 380;

export function defenseFactor(ignoreDefensePct, bossDefensePct) {
  if (bossDefensePct == null || ignoreDefensePct == null) return 1;
  return Math.max(0, 1 - (bossDefensePct / 100) * (1 - ignoreDefensePct / 100));
}

// 보스 딜 근사값. 필요한 스탯이 없으면 null, 방무가 모자라 딜이 안 들어가면 0
export function bossPower(apiStats, defense = REFERENCE_DEFENSE) {
  const s = apiStats || {};
  if (!(s.statAttackMax > 0)) return null;
  const dmg = (s.damage || 0) / 100;
  const boss = (s.bossDamage || 0) / 100;
  const power = s.statAttackMax * ((1 + dmg + boss) / (1 + dmg)) * defenseFactor(s.ignoreDefense, defense);
  return Math.max(0, power);
}

function median(xs) {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

const positive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

// 헥사환산 ↔ API 스탯 비율 k
export function calibrateHexa(characters) {
  const ks = [];
  for (const c of characters) {
    const p = bossPower(c.apiStats);
    if (positive(c.hexaSpec) && positive(p)) ks.push(c.hexaSpec / p);
  }
  return ks.length ? { k: median(ks), samples: ks.length } : null;
}

export function estimateHexa(character, hexaCal) {
  if (!hexaCal) return null;
  const p = bossPower(character?.apiStats);
  return p == null ? null : hexaCal.k * p;
}

// 보스별 100% 기준 헥사환산
export function deriveCuts(characters) {
  const byKey = {};
  for (const c of characters) {
    if (!positive(c.hexaSpec)) continue;
    for (const [key, rate] of Object.entries(c.bossRates || {})) {
      if (positive(rate)) (byKey[key] ||= []).push(c.hexaSpec / (rate / 100));
    }
  }
  return Object.fromEntries(
    Object.entries(byKey).map(([key, bases]) => [key, { base: median(bases), samples: bases.length }]),
  );
}

// 직업별 보정 계수. bases: (bossKey) => 기준값 또는 null
export function deriveClassFactors(characters, baseOfKey) {
  const byClass = {};
  for (const c of characters) {
    if (!c.className || !positive(c.hexaSpec)) continue;
    for (const [key, rate] of Object.entries(c.bossRates || {})) {
      const base = baseOfKey(key);
      if (positive(rate) && positive(base)) (byClass[c.className] ||= []).push((rate / 100) * base / c.hexaSpec);
    }
  }
  return Object.fromEntries(
    Object.entries(byClass).map(([cls, fs]) => [cls, { factor: median(fs), samples: fs.length }]),
  );
}
