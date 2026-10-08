// 사용자가 직접 저장한 maplescouter 페이지 파일(HTML)에서 헥사환산·보스 배율 읽기 (ADR-0002)
// 앱이 사이트에 접속하지 않는다. 사용자가 브라우저에서 "다른 이름으로 저장"한 파일만 읽는다.
//
// 지원: 효율·보스컷(/ko/result), 캐릭터정보(/ko/info) — 2026-10-08 저장 파일 구조 기준
//   - 헥사환산(380): "보스380" 배지 아래 "헥사" 값, 또는 "헥사환산 (380)" 값
//   - 보스 타일: 이미지 파일명 {난이도}_{보스}.png → 타일 환산, 배율(%)
//     "[파티] 33%"(파티 기준), destiny_*, champion_*(해방·유챔 확인용) 타일은 건너뜀

import { bossKey, isValidBossKey } from '../bosses';

const BOSS_ID = {
  kaling: 'kaling',
  bellona: 'bellona',
  limbo: 'limbo',
  maleficStar: 'hyungseong',
  adversary: 'adversary',
  bardrix: 'baldrix',
  seren: 'seren',
  blackMage: 'blackmage',
  kalos: 'kalos',
  lotus: 'swoo',
  jupiter: 'jupiter',
};

const toNumber = (s) => Number(String(s).replace(/,/g, ''));

function readHexa(html) {
  const panel = html.match(/>보스380<[\s\S]{0,1500}?>헥사<\/span>\s*<span[^>]*>([\d,]+)</);
  if (panel) return toNumber(panel[1]);
  const info = html.match(/헥사환산 \(380\)[\s\S]{0,600}?>([\d,]+)</);
  return info ? toNumber(info[1]) : null;
}

function readName(html) {
  const m = html.match(/<title>([^<|]+?)\s*\|/);
  return m ? m[1].trim() : null;
}

/**
 * @returns {{ name: string|null, hexaSpec: number|null, bossRates: Record<string, number>,
 *            tiles: { bossKey: string, tileSpec: number, rate: number }[], skipped: string[] }}
 */
export function parsePage(html) {
  const text = String(html || '');
  const tiles = [];
  const skipped = [];
  // 사이트 경로(/bossIcon/x.png)와 저장 파일 경로(./..._files/x.png) 둘 다
  const parts = text.split(/src="[^"]*?(?:\/bossIcon\/|_files\/)(?=[a-z]+_[A-Za-z]+\.png")/).slice(1);
  for (const part of parts) {
    const icon = part.slice(0, part.indexOf('.png'));
    const [difficulty, boss] = icon.split('_');
    const id = BOSS_ID[boss];
    const key = id ? bossKey(id, difficulty) : null;
    const body = part.slice(0, 1500);
    const spec = body.match(/font-semibold">([\d,]+)<\/div>/);
    const rate = body.match(/>(\[파티\] )?([\d.]+)%<\/div>/);
    if (!key || !isValidBossKey(key) || !spec || !rate || rate[1]) {
      skipped.push(icon);
      continue;
    }
    tiles.push({ bossKey: key, tileSpec: toNumber(spec[1]), rate: Number(rate[2]) });
  }
  return {
    name: readName(text),
    hexaSpec: readHexa(text),
    bossRates: Object.fromEntries(tiles.map((t) => [t.bossKey, t.rate])),
    tiles,
    skipped,
  };
}
