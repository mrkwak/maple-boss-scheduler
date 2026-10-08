# ADR-0001: 새 리포 분리 + 로아 프로젝트 스택 재사용

- 상태: 승인 (2026-10-08, 사용자 결정) — 일부 대체: 로그인은 ADR-0008(비밀 링크), 저장소는 ADR-0007(스프레드시트)

## 배경
- 기존 `loa-guild-raid`(로스트아크)에 비슷한 기능(레이드 방, 파티 슬롯, 3종 세트 그룹, 가능 시간 히트맵, Discord 로그인)이 있다.
- 하지만 도메인이 다르다: 주간 초기화 요일, 보스/난이도 체계, 서폿/딜 구분 없음, 스펙 지표(아이템레벨 → 환산 주스탯), 체인 단위 고정 파티.
- `app/page.js`가 약 2400줄 단일 파일이라 그대로 확장하면 유지보수가 어렵다.

## 결정
- 새 리포 `maple-boss-scheduler`로 분리한다.
- 스택은 그대로: Next.js 14 App Router, Supabase(PostgreSQL + Realtime), Supabase Auth + Discord, Vercel, Jest, GitHub Actions.
- 코드는 복사 후 정리해서 재사용: Discord OAuth 흐름(`lib/supabase.js`), 가능 시간 그리드/히트맵, Realtime 디바운스 리로드, snake↔camel 변환 패턴, 서버 API 프록시 패턴(`app/api/loa/route.js`).
- 처음부터 화면을 컴포넌트 단위 파일로 나눈다.

## 대안
- 기존 리포에 게임 선택 기능 추가 → 도메인 차이가 커서 분기가 많아짐. 기각.

## 결과
- (+) 익숙한 스택, 기존 배포·OAuth 설정 경험 재사용
- (−) 공통 코드가 두 리포에 중복됨 (지인용 소규모라 감수)
