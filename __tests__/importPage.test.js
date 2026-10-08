import { parsePage } from '@/lib/spec/importPage';

// 저장 파일과 같은 구조의 축약 HTML (값은 렌선남아 저장 파일, 2026-10-08)
const tile = (src, spec, rateText) =>
  `<div><button><img alt="boss" src="${src}"></button><div class="relative">` +
  `<div class="inline-flex">솔플 가능</div><div class="text-text-gray-med text-xs font-semibold">${spec}</div>` +
  `<div class="text-[0.7rem] font-medium" style="color: x;">${rateText}</div></div></div>`;

const saved = (icon) => `./렌선남아 _ 효율∙보스컷 - 환산주스탯_files/${icon}.png`;

const html =
  '<title>렌선남아 | 효율∙보스컷 - 환산주스탯</title>' +
  '<span data-slot="badge" class="x">보스380</span><div class="flex"><div><span class="a">일반</span><span class="b">88,000</span></div>' +
  '<div class="flex"><span class="text-xs font-medium">헥사</span><span class="text-xs font-semibold">76,918</span></div></div>' +
  tile(saved('extreme_kaling'), '76,275', '[파티] 41%') +
  tile(saved('extreme_lotus'), '76,224', '153.6%') +
  tile(saved('destiny_seren'), '76,918', '112.4%') +
  tile('/bossIcon/normal_maleficStar.png', '76,918', '132.7%') +
  tile(saved('hard_bardrix'), '74,405', '17.87%');

test('이름·헥사환산(380)·솔로 배율, 파티·데스티니 타일 제외, 두 경로 형식 모두', () => {
  const r = parsePage(html);
  expect(r.name).toBe('렌선남아');
  expect(r.hexaSpec).toBe(76918);
  expect(r.bossRates).toEqual({ 'swoo:extreme': 153.6, 'hyungseong:normal': 132.7, 'baldrix:hard': 17.87 });
  expect(r.tiles.find((t) => t.bossKey === 'swoo:extreme').tileSpec).toBe(76224);
  expect(r.skipped).toEqual(['extreme_kaling', 'destiny_seren']);
});

test('캐릭터정보 페이지는 헥사환산만', () => {
  const info = '<title>집사0 | 캐릭터정보 - 환산주스탯</title><span class="x">헥사환산 (380)</span><span><a><span class="y">69,452<svg></svg></span></a></span>';
  expect(parsePage(info)).toMatchObject({ name: '집사0', hexaSpec: 69452, bossRates: {} });
});

test('빈 입력', () => {
  expect(parsePage('')).toEqual({ name: null, hexaSpec: null, bossRates: {}, tiles: [], skipped: [] });
});
