# 핸드오프 — maple-boss-scheduler

최종 갱신: 2026-10-08 · 단계: M0 (문서 단계, 코드 없음)

## 1. 한 줄 요약
메이플(KMS) 지인 그룹용 "보스 코스(체인) 단위 파티 구성 + 시간 약속" 웹앱. 기획·결정 문서까지 작성했고 코드는 아직 없음. 최대 미결 사항은 **maplescouter 환산값 수집 방식(스파이크 S1)**.

## 2. 현재 위치
- 리포: `mrkwak/maple-boss-scheduler` (사용자가 생성, 2026-10-08 문서 이전 완료)
- 이전 임시 위치: `mrkwak/loa-guild-raid` 브랜치 `claude/maplestory-boss-schedule-lnblxf` 의 `maple-boss-scheduler/` 폴더 (정리 대상)

## 3. 결정된 것
| 항목 | 내용 | 근거 |
|---|---|---|
| 리포 | 새 리포 분리 | ADR-0001 (사용자 결정) |
| 스택 | Next.js 14 + Supabase + Discord OAuth + Vercel | ADR-0001 |
| 파티 단위 | 보스 코스(체인)에 파티 고정 | ADR-0004 |
| 스펙 지표 | 환산 주스탯(maplescouter), 수동 입력은 최후 수단 | ADR-0002 (사용자 요구) |
| 환산 사용 정책 | 허락 없이 저빈도·내부용으로 사용 (문의 채널 없음, 이용자 ~5명) | ADR-0002 (사용자 결정) |
| 수집 실행 | GitHub Actions 배치 + DB 캐시 | ADR-0003 (제안) |
| 보스 데이터 | 코드 설정 파일 | ADR-0006 |

## 4. 확인된 사실 vs 미확인
**확인됨**
- maplescouter 공식 공개 API 문서는 검색으로 찾지 못함
- GitHub `Maplescouter` 조직에 공개 리포 없음 (사용자 확인: 사이트에 문의 채널 없음)
- 기존 로아 프로젝트 구조(코드로 확인): Supabase 스키마, 서버 API 프록시, 가능시간 JSONB, Realtime 디바운스

**미확인 (구현 전 필수)**
- maplescouter 내부 데이터 경로·봇 차단·약관 — 세션 네트워크 정책으로 `maplescouter.com`, `open.api.nexon.com` 둘 다 접속 차단됨
- 넥슨 Open API 정확한 엔드포인트·필드·호출 제한 (서드파티 코드 기준 정보만 있음)
- 주간 초기화 시각 (목요일 0시 KST로 알고 있으나 미검증), 2026-06-18 주간 컨텐츠 개편 영향
- 보스별 난이도·최대 인원
- 같은 사람 캐릭 2개 한 코스 허용 여부 (정책 결정 필요)

## 5. 블로커
| 블로커 | 해결 방법 | 담당 |
|---|---|---|
| maplescouter / 넥슨 API 접속 차단 | Claude 세션 환경 설정 → Network access → Allowed domains에 `maplescouter.com`, `open.api.nexon.com` 추가 ("Allow package managers" 체크 유지). 또는 로컬 PC에서 F12 확인 후 결과 공유 | 사용자 |
| 넥슨 API 키 | openapi.nexon.com에서 앱 등록 후 키 발급 | 사용자 |

## 6. 다음 작업 (순서)
1. [사용자] 네트워크 허용 도메인 추가 + 넥슨 API 키 발급
2. [S1] maplescouter 수집 방식 판정 → ADR-0002 갱신 (체크리스트는 ADR-0002 하단)
3. [M0] Next.js 스캐폴드, Supabase 프로젝트, CI(test+build) — 로아 프로젝트 `ci.yml` 재사용
4. [M1] Discord 로그인 + 캐릭터 등록(넥슨 API 기본정보)
5. [M2] `lib/bosses.js`, `lib/week.js` + 단위 테스트, 주간 목표 UI
6. 이후 PLAN.md 마일스톤 M3~M6

## 7. 환경변수 (예정)
| 이름 | 위치 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | 클라이언트 |
| `NEXON_API_KEY` | Vercel, GitHub Secrets | 넥슨 Open API (서버 전용) |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets만 | 배치 수집 쓰기 |
| `NEXT_PUBLIC_ADMIN_DISCORD_IDS` | Vercel | 관리자 |

## 8. 로아 프로젝트에서 가져올 파일
| 원본 (`loa-guild-raid`) | 용도 |
|---|---|
| `lib/supabase.js` | Discord OAuth, 세션 이벤트 처리 (모바일 리다이렉트 대응 포함) |
| `lib/db.js` | DB 추상화 패턴 |
| `app/api/loa/route.js` | 서버 프록시 패턴 → `app/api/nexon/route.js` |
| `app/page.js` 내 가능시간 탭 | 스케줄 그리드 / 공대 시간 찾기 히트맵 |
| `.github/workflows/ci.yml` | CI |
| `discord-oauth-setup.md`, `DEPLOY.md` | 설정 가이드 |
