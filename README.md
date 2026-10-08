# maple-boss-scheduler

메이플스토리(한국 서버) 지인끼리 **비슷한 스펙의 캐릭터끼리 주간 보스를 묶어서 같이 가는** 파티 구성 · 일정 약속 페이지.

> 현재 단계: 문서(M0) — 코드 없음. 진행 상황은 [docs/HANDOFF.md](docs/HANDOFF.md) 참고.

## 핵심 아이디어

- 한 사람이 캐릭터를 여러 개 가질 수 있음 (1캐릭 ~ 다캐릭 혼재)
- 캐릭터별로 이번 주 갈 보스를 체크
- **보스 코스(체인)**: 예) `익스트림 스우 → 노말 흉성 → 노말 카링` 을 **같은 캐릭터 조합으로 쭉** 진행
- 스펙 비교 기준은 **환산 주스탯 (maplescouter.com)** — 수집 방식은 [ADR-0002](docs/adr/0002-spec-data-source.md) 참고
- 가능 시간 히트맵으로 약속 시간 결정 (loa-guild-raid의 가능시간 기능 재사용)

## 문서

| 문서 | 내용 |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | 계획서 — 요구사항, 도메인 모델, DB 스키마 초안, 매칭 로직, 마일스톤 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 핸드오프 — 현재 상태, 확인된/미확인 사항, 블로커, 다음 작업 |
| [docs/adr/](docs/adr/) | 아키텍처 결정 기록 (ADR) |

## 기술 스택 (예정)

Next.js 14 (App Router) · Supabase (PostgreSQL + Realtime) · Discord OAuth · Vercel · GitHub Actions(수집 배치)
