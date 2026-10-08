// 헥사환산·보스 배율 역산 추정 (ADR-0010)
//
// 구조 (maplescouter 보스컷 화면 관찰, 2026-10-08):
//   보스 배율(%) = 그 보스 조건의 내 헥사환산 ÷ 보스별 100% 기준 헥사환산 × 100
//   예) 헥사환산 69,452 · 89.94% → 기준 약 77,220
//
// 이 앱의 역산
//   1. 보스별 기준값 = 컷표 값, 없으면 직접 배율로 역산 (헥사환산 × 직업 보정 ÷ 배율), 여러 캐릭터면 중앙값
//   2. 헥사환산 추정 = k × 보스 딜 근사(넥슨 API 스탯, 방어율 380% 기준)
//      k = 직접 입력한 헥사환산 ÷ 보스 딜 근사, 직업별 중앙값 (그 직업 샘플이 없으면 전체 중앙값)
//      2026-10-08 확인: 넥슨 API 스탯은 버프 상태 등으로 1시간 사이에도 약 2% 흔들림
//   보스 딜 근사 = 최대 스탯공격력 × (1 + 데미지% + 보공%) / (1 + 데미지%) × max(0, 1 − 방어율 × (1 − 방무))
//
//   3. 직업 보정 = 같은 직업 캐릭터의 (직접 배율 × 보스 기준값 ÷ 헥사환산) 중앙값.
//      2026-10-08 확인: 같은 보스라도 렌선남아(렌)의 기준값이 집사0(아란)보다 약 11~15% 낮음 → 직업 체급 차이로 봄
//      보정값이 없는 직업은 1 (기준 직업과 같다고 가정)
//
//   4. 어센틱포스 보정 (넥슨 공식 가이드 공식): 격차 = 내 어센틱포스 − 보스 요구치
//      격차 ≥ 0 → 1 + min(격차/2, 25)%, 격차 < 0 → 100% − |격차|% (최소 5%)
//      대부분 보스는 +25% 상한에 걸리므로 상한(1.25) 대비 비율로 쓴다 → 상한이면 1
//      2026-10-08 확인: 노말 발드릭스(요구 700) 집사0 660 / 렌선남아 740의 기준값 차이가 이걸로 설명됨
//
// [가정·미반영] 스탯공격력에 데미지%가 들어 있다고 봄, 아케인포스·레벨 손실, 도핑, 크리티컬

export const REFERENCE_DEFENSE = 380;
const FORCE_CAP = 1.25;

// 어센틱포스 보정 (상한 대비). 값을 모르면 1
export function forceFactor(myForce, required) {
  if (!(myForce > 0) || !(required > 0)) return 1;
  const gap = myForce - required;
  const dmg = gap >= 0 ? 1 + Math.min(gap / 2, 25) / 100 : Math.max(0.05, 1 + gap / 100);
  return dmg / FORCE_CAP;
}

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

// 헥사환산 ↔ API 스탯 비율 k. 직업별로 따로 잡고(헥사 코어·직업 차이), 그 직업 샘플이 없으면 전체 중앙값
export function calibrateHexa(characters) {
  const all = [];
  const byClass = {};
  for (const c of characters) {
    const p = bossPower(c.apiStats);
    if (!positive(c.hexaSpec) || !positive(p)) continue;
    const k = c.hexaSpec / p;
    all.push(k);
    if (c.className) (byClass[c.className] ||= []).push(k);
  }
  if (!all.length) return null;
  return {
    k: median(all),
    samples: all.length,
    byClass: Object.fromEntries(Object.entries(byClass).map(([cls, ks]) => [cls, { k: median(ks), samples: ks.length }])),
  };
}

export function estimateHexa(character, hexaCal) {
  if (!hexaCal) return null;
  const p = bossPower(character?.apiStats);
  if (p == null) return null;
  const k = hexaCal.byClass?.[character?.className]?.k ?? hexaCal.k;
  return k * p;
}

// 보스별 100% 기준 헥사환산 (기준 직업 단위). factorOf(character) = 그 캐릭터 직업 보정 (없으면 1)
export function deriveCuts(characters, factorOf = () => 1, forceOf = () => 1) {
  const byKey = {};
  for (const c of characters) {
    if (!positive(c.hexaSpec)) continue;
    const f = factorOf(c);
    for (const [key, rate] of Object.entries(c.bossRates || {})) {
      if (positive(rate)) (byKey[key] ||= []).push((c.hexaSpec * f * forceOf(c, key)) / (rate / 100));
    }
  }
  return Object.fromEntries(
    Object.entries(byKey).map(([key, bases]) => [key, { base: median(bases), samples: bases.length }]),
  );
}

// 직업별 보정 계수. bases: (bossKey) => 기준값 또는 null
export function deriveClassFactors(characters, baseOfKey, forceOf = () => 1) {
  const byClass = {};
  for (const c of characters) {
    if (!c.className || !positive(c.hexaSpec)) continue;
    for (const [key, rate] of Object.entries(c.bossRates || {})) {
      const base = baseOfKey(key);
      const ff = forceOf(c, key);
      if (positive(rate) && positive(base) && positive(ff)) {
        (byClass[c.className] ||= []).push(((rate / 100) * base) / (c.hexaSpec * ff));
      }
    }
  }
  return Object.fromEntries(
    Object.entries(byClass).map(([cls, fs]) => [cls, { factor: median(fs), samples: fs.length }]),
  );
}
