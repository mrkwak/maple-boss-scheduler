# 핸드오프 — maple-boss-scheduler

최종 갱신: 2026-10-08 (5차) · 단계: M1 완료 + 배율 역산·순위 화면 → M2(목표) 진행 중

## 1. 한 줄 요약
메이플(KMS) 지인 그룹용 "보스 코스(체인) 단위 파티 구성 + 시간 약속" 웹앱. 지표는 **헥사 환산 + 보스별 배율(%)**. maplescouter 운영자에게 사용 허락 문의 중이며 **허락 가정으로 개발**(조회 구현만 답변 후). M0(기본 구조·핵심 로직)·M1(멤버·캐릭터 등록 화면) 완료, 다음은 M2(목표·배율 줄 세우기).

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
| 스펙 지표 | 헥사 환산 + 보스별 배율(%). 최초 등록 시 1회 자동 조회(허락 후), 그 전엔 직접 입력 | ADR-0002 (사용자 결정) |
| 줄 세우기·묶기 | 보스 배율 순 정렬, 파티 배율 = 파티원 배율 합(≥100% 가능) [가정] | ADR-0009 |
| 컷표 | 배율 없을 때 `헥사 환산 ÷ base_spec`으로 환산. 시트 `boss_cuts` 탭 | ADR-0009 (제안) |
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

**참고**: 세션에서 maplescouter 페이지를 curl로 몇 차례 조회함(메인, 파티 보스컷, 보스정보, 약관, robots.txt). 약관 확인 후에는 접속하지 않음. **운영자 허락 전에는 코드·세션에서 maplescouter 자동 접근 금지** (내부 요청 추정·분석 포함).

### maplescouter 문의 (2026-10-08)
- 받는 곳: `maplescouter@gmail.com`, 제목 "환산 주스탯 수집 가능 여부 문의 드립니다."
- 내용: 지인 5명·인당 1~3캐릭, 헥사 환산·보스 배율로 파티 묶기, 비공개·비상업, 출처 표기 가능
- Gmail 연결 권한 부족으로 Claude가 발송 못 함 → 사용자가 직접 발송
- 답변 오면: 허락 범위·방식에 맞춰 `lib/spec/provider.js`의 `maplescouterProvider` 구현, ADR-0002 갱신

## 5. 블로커
| 블로커 | 해결 방법 | 담당 |
|---|---|---|
| ~~넥슨 API 키~~ | 발급 완료 (개발 단계). 배포 시 서비스 단계 전환 필요 여부는 미확인 | 사용자 |
| Google 서비스 계정 | Google Cloud 프로젝트 → Sheets API 사용 설정 → 서비스 계정 키(JSON) 발급 → 스프레드시트를 서비스 계정 이메일에 편집자로 공유 | 사용자 |

## 6. 다음 작업 (순서)
1. [사용자] maplescouter 문의 메일 발송 → 답변 공유
2. [사용자] ADR-0007(스프레드시트), ADR-0009(배율 합 판정) 확인
3. [사용자] 넥슨 API 키, Google 서비스 계정·스프레드시트 준비 (탭 이름·헤더는 `lib/db/schema.js`)
4. [M2] 목표 UI(주간·월간), 배율 줄 세우기 화면, 컷표 읽기
5. 이후 PLAN.md 마일스톤 M3~M6
6. [정리] `loa-guild-raid`의 임시 폴더/브랜치 정리 (사용자 확인 후)

## M0에서 만든 것 (2026-10-08)
- Next.js 14 App Router(JS), Jest(next/jest), ESLint, GitHub Actions CI (lint → test → build)
- `middleware.js`: `?k=<ACCESS_KEY>` → HttpOnly 쿠키 발급 후 주소에서 키 제거, 그 외 404. `robots.txt` 전체 차단 + noindex
- `lib/db/`: 스프레드시트 어댑터(헤더 이름으로 컬럼 매칭, 15초 캐시) + 메모리 어댑터. `SHEET_ID` 없으면 메모리(운영에선 오류)
- `lib/bosses.js`: 보스·난이도 18종 (maplescouter 파티 보스컷 화면 목록 기준). `maxParty`는 미확인이라 null
- `lib/week.js`, `lib/rates.js`, `lib/matching.js`, `lib/rules.js`, `lib/spec/provider.js`, `lib/nexon.js` + 단위 테스트
- 확인: `npm test` 41개 통과, `npm run lint` 경고 없음, `npm run build` 성공, `next start`에서 키 없음/틀림 404 · 맞는 키 307+쿠키 · 쿠키로 200 확인
- 미확인: 실제 Google 시트·넥슨 API 연동(키 없음), Vercel 배포

## M1에서 만든 것 (2026-10-08)
- API: `GET/POST /api/members`, `GET/POST /api/characters`, `PATCH/DELETE /api/characters/[id]` (`lib/server.js`의 `handle`로 오류 처리)
- 서비스: `lib/services/roster.js` — 멤버 추가(이름 중복 차단), 캐릭터 등록(넥슨 API ocid·기본정보 → 공급자가 조회 가능하면 헥사 환산·배율 1회 저장, 실패해도 등록), 수동 입력, 삭제 시 목표·코스 배정 정리
- 화면: "나는 누구?" 선택/추가(localStorage 기억), 내 캐릭터 등록·환산 입력(헥사 환산 + 보스 배율 여러 개)·삭제, 다른 사람 캐릭터 목록, 14일+ 오래됨 표시, 환산주스탯 결과 페이지 링크
- 넥슨 키가 없으면 닉네임만 등록 + 안내 문구 (개발용)
- 확인: 테스트 49개 통과, lint·build 통과, Playwright(390px 화면)로 링크 접근 → 멤버 추가 → 등록 → 환산 입력 → 새로고침 후 기억 → 다른 멤버 → 중복 차단 → 삭제까지 확인
- 미확인: 실제 시트 저장

### 넥슨 Open API 실연동 확인 (2026-10-08, 개발 단계 키)
- 키는 사용자가 발급(서비스명 "파티보스", 개발 단계). 로컬 `.env.local`에만 저장(깃 제외). Vercel에는 사용자가 환경변수로 넣어야 함
- `GET /maplestory/v1/id?character_name=` → `{ ocid }`, `GET /maplestory/v1/character/basic?ocid=` → `character_name, world_name, character_class, character_level, character_image` 등 확인
- 오류는 모두 HTTP 400 + `error.name`: 없는 캐릭터 `OPENAPI00004`, 잘못된 키 `OPENAPI00005` → 코드로 구분하도록 수정
- `GET /maplestory/v1/character/stat`의 `final_stat`에 `전투력` 있음 (참고 지표로 쓸지 미정)
- 앱 경유 등록 확인: 존재 캐릭터 → 월드·직업·레벨 자동, 없는 닉네임 → 404 안내, 같은 ocid 재등록 → 409
- 이 클라우드 세션에서는 Node fetch가 프록시를 안 타서 `NODE_USE_ENV_PROXY=1 npm run dev`로 실행해야 외부 API 호출됨 (Vercel에는 해당 없음)
- 호출 제한(일일·초당)은 아직 확인 못 함

## 보스 배율 역산 (2026-10-08, ADR-0010)
- maplescouter 자동 조회 없이, 공개 설명(배율 = 섀도어 장인 30분 = 100%, 보총·방무 공식)과 넥슨 API 스탯으로 역산
- 직접 배율 1개만 있어도 같은 보스의 다른 캐릭터를 추정. 출처(직접/추정/컷표) 표시
- 기준 캐릭터: 집사0(크로아·아란·Lv.291, 방무 91.28%, 헥사환산(380) 69,452 — 사용자 제공), 렌선남아(크로아·렌·Lv.294, 방무 90.58%, 헥사환산(380) 76,918 — 저장 파일, 앱 추정은 72,584)
- 화면: "보스 배율 순위"(보스 선택 → 배율 순), 캐릭터 카드에 전투력·"정보 갱신"
- 사용자가 붙여넣은 집사0 보스컷 화면으로 보스 22개 기준값 역산 완료 (ADR-0009 "기준값 확보"). 앱 계산이 화면 배율과 약 1% 이내로 일치
- 기준값은 공개 저장소에 올리지 않음 → 개발은 `data/seed.local.json`(깃 제외), 운영은 시트 `boss_cuts` 탭에 사용자가 입력
- 다음 확인: 다른 캐릭터 1~2명의 실제 헥사환산(380)과 앱 추정값 비교 → 헥사환산 추정식(API 스탯 비례) 오차 확인
- 운영자 허락 받음(사이트 수집·보스 배율까지). 자동 조회는 보류 (사용자 결정, 이 세션 안전 검사에도 막힘)
- **저장 파일 가져오기** 추가: 캐릭터 카드 → 환산 입력 → "환산주스탯 저장 파일로 가져오기" → 효율·보스컷 페이지 저장 파일(.html) 선택 → 헥사환산·보스 배율 자동 입력 (다른 캐릭 파일은 거부)
- 렌선남아 저장 파일로 검증: 헥사환산 76,918, 배율 23개. 직업별 기준값 차이(11~15%) 발견 → 직업 보정 추가 (ADR-0010)
- 정확도: 직업마다 배율 1개만 있으면 나머지 보스 평균 오차 약 3% (없으면 12%). 노말 발드릭스만 예외(약 30%)

## 7. 환경변수 (예정)
| 이름 | 위치 | 용도 |
|---|---|---|
| `ACCESS_KEY` | Vercel | 비밀 링크 키 |
| `SPEC_PROVIDER` | Vercel | `manual`(기본) / `maplescouter`(허락·구현 후) |
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
