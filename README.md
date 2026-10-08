# maple-boss-scheduler

메이플스토리(한국 서버) 지인끼리 **비슷한 스펙의 캐릭터끼리 주간 보스를 묶어서 같이 가는** 파티 구성 · 일정 약속 페이지.

> 현재 단계: M0 완료(기본 구조·핵심 로직·테스트). 진행 상황은 [docs/HANDOFF.md](docs/HANDOFF.md) 참고.

## 핵심 아이디어

- 한 사람이 캐릭터를 여러 개 가질 수 있음 (1캐릭 ~ 다캐릭 혼재)
- 캐릭터별로 이번 주 갈 보스를 체크
- **보스 코스(체인)**: 예) `익스트림 스우 → 노말 흉성 → 노말 카링` 을 **같은 캐릭터 조합으로 쭉** 진행
- 스펙 비교 기준은 **헥사 환산과 보스별 배율(%)** — 배율로 캐릭터를 줄 세우고 파티 배율로 묶음 ([ADR-0009](docs/adr/0009-boss-cut-table.md)). maplescouter 조회는 운영자 허락 후, 그 전엔 직접 입력 ([ADR-0002](docs/adr/0002-spec-data-source.md))
- 주차별 가능 시간 히트맵으로 약속 시간 결정 (loa-guild-raid의 가능시간 기능 재사용)

## 문서

| 문서 | 내용 |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | 계획서 — 요구사항, 도메인 모델, DB 스키마 초안, 매칭 로직, 마일스톤 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 핸드오프 — 현재 상태, 확인된/미확인 사항, 블로커, 다음 작업 |
| [docs/adr/](docs/adr/) | 아키텍처 결정 기록 (ADR) |

## 기술 스택 (예정)

Next.js 14 (App Router) · Google 스프레드시트(저장소, ADR-0007) · 비밀 링크 접근(로그인 없음, ADR-0008) · Vercel · 넥슨 Open API

## 개발

```bash
npm install
cp .env.example .env.local   # 값 채우기 (비워두면 메모리 저장소로 동작)
npm run dev                  # ACCESS_KEY를 넣었다면 http://localhost:3000/?k=<ACCESS_KEY>
npm test
```

| 폴더 | 내용 |
|---|---|
| `lib/bosses.js` | 보스·난이도 목록, 보스 키(`swoo:extreme`) |
| `lib/week.js` | 주차(목 0시 KST)·월 기간 키 |
| `lib/rates.js` | 보스 배율, 줄 세우기, 파티·코스 판정 |
| `lib/matching.js` | 파티 추천 점수 |
| `lib/rules.js` | 코스 규칙 검사 |
| `lib/spec/provider.js` | 환산 공급자 (manual / maplescouter 자리) |
| `lib/nexon.js` | 넥슨 Open API 클라이언트 |
| `lib/db/` | 저장소 (Google 스프레드시트 / 메모리) |
| `middleware.js` | 비밀 링크 접근 제한 |
