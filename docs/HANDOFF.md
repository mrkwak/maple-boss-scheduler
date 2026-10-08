# 핸드오프 — maple-boss-scheduler

최종 갱신: 2026-10-08 (2차) · 단계: M0 직전 (문서 단계, 코드 없음)

## 1. 한 줄 요약
메이플(KMS) 지인 그룹용 "보스 코스(체인) 단위 파티 구성 + 시간 약속" 웹앱. 기획·결정 문서 작성 완료, 코드 없음. maplescouter 약관상 자동 수집이 금지돼 **환산은 수동 입력**으로 확정. 다음은 스캐폴드(M0).

## 2. 현재 위치
- 리포: `mrkwak/maple-boss-scheduler`
- 이전 임시 위치: `mrkwak/loa-guild-raid` 브랜치 `claude/maplestory-boss-schedule-lnblxf` 의 `maple-boss-scheduler/` 폴더 (정리 대상 — 아래 6번)

## 3. 결정된 것
| 항목 | 내용 | 근거 |
|---|---|---|
| 리포 | 새 리포 분리 | ADR-0001 (사용자 결정) |
| 스택 | Next.js 14 + Vercel + 넥슨 Open API | ADR-0001 |
| 접근 | 비밀 링크만, 로그인 없음, 멤버는 "나는 누구?" 선택 | ADR-0008 (사용자 결정) |
| 저장소 | Google 스프레드시트 1개, `lib/db` 인터페이스로 교체 가능 | ADR-0007 (사용자 요구 반영, 제안) |
| 파티 단위 | 보스 코스(체인)에 파티 고정, 초대·수락 없음(추가 즉시 확정) | ADR-0004, 사용자 결정 |
| 환산 | 수동 입력 + maplescouter 링크. 자동 수집 안 함 | ADR-0002 (약관 제15조) |
| 보스 컷표 | 시트 `boss_cuts` 탭, 사용자가 직접 설정 | ADR-0009 (제안) |
| 가능 시간 | 주차별로 새로 입력 | 사용자 결정 |
| 월간 보스 | 주간과 별도 기간(`2026-10`)으로 처리 | ADR-0005, 사용자 결정 |
| ocid | 닉네임 바뀌어도 유지 → 캐릭터 식별 기준 | 사용자 확인 |
| 보스 마스터 | 코드 설정 파일 `lib/bosses.js` | ADR-0006 |

## 4. 확인된 사실 vs 미확인
**확인됨 (2026-10-08)**
- 세션 네트워크에서 `maplescouter.com`, `openapi.nexon.com` 접속 가능. `open.api.nexon.com`은 연결되나 키 없이 루트 400 (API 동작은 미확인)
- maplescouter: `robots.txt` 전체 허용, Cloudflare 사용, **이용약관 제15조가 자동화 접근·데이터 소스 사용 금지**, 하단에 "문의하기"·연락처 있음
- maplescouter "파티 보스컷"은 파티원 닉네임 기반 자체 계산 (복제 불가)
- Google Sheets API 한도: 프로젝트당 분당 읽기/쓰기 각 300, 사용자당 60
- 기존 로아 프로젝트 구조(코드로 확인): 가능시간 JSONB, 서버 API 프록시 패턴

**미확인 (구현 전 필수)**
- 넥슨 Open API 엔드포인트·필드·호출 제한 (API 키 필요)
- 주간 초기화 시각(목 0시 KST로 알고 있음), 월간 초기화 시각, 2026-06-18 개편 영향
- 보스별 난이도·최대 인원 (공식 출처)
- 보스 컷표 초기값 (사용자가 커뮤니티 자료 참고해 결정)
- 같은 사람 캐릭 2개 한 코스 허용 여부
- Supabase 무료 플랜 비활성 일시정지(약 7일)는 서드파티 자료 기준, 공식 문서 미확인

**참고**: 이 세션에서 maplescouter 페이지를 curl로 몇 차례 조회함(메인, 파티 보스컷, 보스정보, 약관, robots.txt). 약관 확인 후에는 접속하지 않음. 앞으로도 코드·세션에서 maplescouter 자동 접근 금지.

## 5. 블로커
| 블로커 | 해결 방법 | 담당 |
|---|---|---|
| 넥슨 API 키 | openapi.nexon.com에서 앱 등록 후 키 발급 | 사용자 |
| Google 서비스 계정 | Google Cloud 프로젝트 → Sheets API 사용 설정 → 서비스 계정 키(JSON) 발급 → 스프레드시트를 서비스 계정 이메일에 편집자로 공유 | 사용자 |

## 6. 다음 작업 (순서)
1. [사용자] ADR-0007(스프레드시트), ADR-0009(컷표 방식) 확인 → 승인 또는 수정
2. [사용자] 넥슨 API 키, Google 서비스 계정·스프레드시트 준비
3. [M0] Next.js 스캐폴드, 비밀 링크 미들웨어, `lib/db` 시트 어댑터 + 테스트, CI (로아 `ci.yml` 재사용)
4. [M1] 멤버 선택/추가, 캐릭터 등록(넥슨 API), 환산 수동 입력
5. [M2] `lib/bosses.js`, `lib/week.js`(주간/월간), 목표 UI, 컷표 판정
6. 이후 PLAN.md 마일스톤 M3~M6
7. [정리] `loa-guild-raid`의 임시 폴더/브랜치 정리 (사용자 확인 후)

## 7. 환경변수 (예정)
| 이름 | 위치 | 용도 |
|---|---|---|
| `ACCESS_KEY` | Vercel | 비밀 링크 키 |
| `NEXON_API_KEY` | Vercel | 넥슨 Open API (서버 전용) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Vercel | 스프레드시트 접근 (서버 전용) |
| `SHEET_ID` | Vercel | 스프레드시트 ID |

## 8. 로아 프로젝트에서 가져올 파일
| 원본 (`loa-guild-raid`) | 용도 |
|---|---|
| `lib/db.js` | DB 추상화 패턴 → 시트 어댑터로 재작성 |
| `app/api/loa/route.js` | 서버 프록시 패턴 → `app/api/nexon/route.js` |
| `app/page.js` 내 가능시간 탭 | 스케줄 그리드 / 시간 찾기 히트맵 (주차별 저장으로 변경) |
| `.github/workflows/ci.yml` | CI |
| `DEPLOY.md` | 배포 가이드 참고 |

(Discord OAuth `lib/supabase.js`, `discord-oauth-setup.md`는 로그인을 넣지 않기로 해서 제외)
