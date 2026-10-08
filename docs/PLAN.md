# 계획서 — maple-boss-scheduler

작성일: 2026-10-08 · 상태: 초안

표기 규칙: **[확인됨]** 출처 또는 코드로 검증 / **[미확인]** 검증 안 됨, 구현 전 확인 필수 / **[가정]** 설계상 임시로 둔 값

---

## 1. 배경과 목표

- 지인 그룹이 메이플스토리(KMS) 주간 보스를 같이 잡는다.
- 사람마다 키우는 캐릭터 수가 다르다(1개 ~ 여러 개).
- **비슷한 스펙의 캐릭터끼리** 파티를 짜야 하고, **시간 약속**도 잡아야 한다.
- 선호 패턴: 한 캐릭터가 비슷한 난이도 보스 여러 개를 **같은 상대 캐릭터와 연속으로** 진행.
  - 예) 내 A캐릭 + 지인 B캐릭 → `익스트림 스우 → 노말 흉성 → 노말 카링`

### 목표
1. 캐릭터 등록 + 스펙(환산 주스탯) 자동 반영
2. 캐릭터별 주간 보스 목표 체크
3. **보스 코스(체인)** 단위로 파티 구성 + 추천
4. 가능 시간 기반 약속 시간 결정
5. 주간 진행 현황(클리어 체크) 공유

### 비목표 (1차 범위 밖)
- 결정석 수익 계산, 보스 보상 정보
- 디스코드 봇
- 메이플스카우터 계산 공식 자체 구현

---

## 2. 사용자 시나리오

1. **등록**: Discord 로그인 → 내 캐릭터 닉네임 입력 → 직업/레벨/환산 자동 채움
2. **주간 목표**: 캐릭터마다 이번 주 갈 보스·난이도 체크 (지난주 설정 복사)
3. **코스 만들기**: "익스 스우 → 노말 흉성 → 노말 카링" 같은 코스 생성 → 내 캐릭 넣기
4. **추천 받기**: 같은 보스를 목표로 하고 환산이 비슷한 다른 사람 캐릭 목록 → 초대
5. **시간 정하기**: 코스 참가자 전원의 가능 시간 히트맵 → 시간 확정
6. **공유**: 카톡/디코 복사용 텍스트
7. **진행**: 보스별 클리어 체크, 주간 초기화 시 자동 리셋

---

## 3. 도메인 모델

```
Member (사람, Discord 계정)
 └─ Character (여러 개)                — 닉네임, 직업, 레벨, 환산값, 갱신시각
      └─ WeeklyGoal (주차별)           — 이 캐릭이 이번 주 갈 보스·난이도 목록

Course (보스 코스 = 체인)              — 주차, 시작 일시, 메모, 상태
 ├─ CourseStep (순서 있음)             — 보스·난이도, 순서, 클리어 여부
 └─ CourseMember                       — 이 코스에 고정으로 들어가는 캐릭터들
```

핵심 규칙
- 코스 안의 모든 보스는 **같은 캐릭터 조합**으로 간다 → 파티는 Step이 아니라 **Course에 붙는다**.
- 같은 사람의 캐릭터는 한 코스에 둘 이상 들어갈 수 없다(동시에 두 캐릭 조작 불가). [가정 — 사용자 확인 필요]
- 한 사람은 같은 시간대에 두 코스에 있을 수 없다 (시간 충돌 경고).
- 한 캐릭터가 같은 주차에 같은 보스를 두 코스에서 중복 진행할 수 없다.
- 코스 최대 인원 = 코스 안 보스들의 최대 파티 인원 중 **최솟값**. 보스별 인원 제한은 보스 설정 파일에서 관리. [미확인 — 값 확인 필요]

---

## 4. DB 스키마 초안 (Supabase / PostgreSQL)

```sql
create table members (
  id text primary key,
  discord_id text unique,
  name text not null,
  availability jsonb default '{"anyTime":false,"slots":{},"memo":""}',
  created_at timestamptz default now()
);

create table characters (
  id text primary key,
  member_id text not null references members(id) on delete cascade,
  name text not null,              -- 인게임 닉네임
  world text,                      -- 월드
  class text,
  level int,
  ocid text,                       -- 넥슨 Open API 캐릭터 식별자 (ADR-0002)
  spec_value numeric,              -- 환산 주스탯
  spec_source text,                -- 'maplescouter' | 'manual' 등
  spec_updated_at timestamptz,     -- 마지막 갱신 시각 (UI에 항상 표시)
  spec_raw jsonb,                  -- 원본 응답 일부 (디버깅용)
  created_at timestamptz default now()
);

create table weekly_goals (
  id text primary key default gen_random_uuid()::text,
  character_id text not null references characters(id) on delete cascade,
  week_start date not null,        -- 주차 시작일 (ADR-0005)
  boss_id text not null,           -- bosses 설정 파일의 id (예: 'swoo')
  difficulty text not null,        -- 'easy'|'normal'|'hard'|'chaos'|'extreme'
  unique (character_id, week_start, boss_id)
);

create table courses (
  id text primary key,
  week_start date not null,
  title text,
  start_at timestamptz,
  memo text default '',
  status text default 'planned',   -- planned | done | canceled
  created_by text references members(id),
  created_at timestamptz default now()
);

create table course_steps (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references courses(id) on delete cascade,
  step_index int not null,
  boss_id text not null,
  difficulty text not null,
  cleared boolean default false,
  unique (course_id, step_index)
);

create table course_members (
  course_id text not null references courses(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  primary key (course_id, character_id)
);
```

- 보스 마스터 데이터는 DB가 아니라 코드 내 설정 파일 `lib/bosses.js` (ADR-0006)
- RLS: 로아 프로젝트는 `Allow all` 이었음 → 이번엔 최소한 쓰기는 로그인 사용자만 허용하도록 개선 권장

---

## 5. 스펙(환산) 데이터 수집

결정 내용은 [ADR-0002](adr/0002-spec-data-source.md), [ADR-0003](adr/0003-spec-fetch-batch.md).

요약
- 기본 정보(직업·레벨·월드·ocid): **넥슨 Open API** (`open.api.nexon.com`, 헤더 `x-nxopen-api-key`) [출처: 서드파티 SDK 코드 기준, 공식 문서 재확인 필요]
- 환산 주스탯: **maplescouter.com** — 수집 방식은 스파이크(조사) 후 결정
  - 1순위: 사이트가 호출하는 내부 JSON 응답에서 추출 (가능한지 [미확인])
  - 2순위: Playwright로 결과 페이지 렌더 후 DOM에서 추출
  - 공통: 별도 허락 없이 사용 (사용자 결정 — 이용자 약 5명, 저빈도 조회, 출처 링크 표시). [ADR-0002](adr/0002-spec-data-source.md)
- 실시간 조회 X → **배치 수집 + DB 캐시**, 페이지는 저장값만 표시
- 수집 실패/미지원 시 임시로 수동 입력 허용 (`spec_source='manual'`)
- 넥슨 Open API 데이터 30일 내 갱신 고지 있음 → 배치 주기에 반영 [출처: openapi.nexon.com 검색 결과 요약, 원문 재확인 필요]

수집 모듈 인터페이스 (교체 가능하게 격리)
```js
// lib/spec/provider.js
// fetchSpec(characterName) => { value: number, raw: object, fetchedAt: Date }
```

---

## 6. 파티 추천(매칭) 로직

입력: 기준 코스(보스 목록) + 기준 캐릭터

1. **후보 필터**
   - 이번 주 `weekly_goals`에 코스의 보스가 1개 이상 있는 캐릭터
   - 기준 캐릭터와 다른 사람(member)
   - 해당 보스를 이번 주 다른 코스에 이미 배정받지 않은 캐릭터
2. **점수**
   - 보스 겹침 비율: `|코스 보스 ∩ 후보 목표| / |코스 보스|` (가중치 높게 — "쭉 같이" 요구)
   - 스펙 근접도: `1 - |log(후보 환산 / 기준 환산)|` 를 0~1로 클램프 [가정 — 실제 데이터 보고 조정]
   - 시간 겹침: 두 사람 가능 시간 교집합 칸 수
   - 스펙 갱신이 오래됨(예: 14일+)이면 감점 표시만
3. **출력**: 점수순 목록 + 겹치는 보스 / 빠지는 보스 표시

**코스 자동 제안** (2단계 기능): 두 캐릭터의 목표 보스 교집합을 하나의 코스로 묶어 제안.

---

## 7. 화면 구성

| 탭 | 내용 |
|---|---|
| 대시보드 | 이번 주 코스 카드(일시·보스 순서·멤버·진행), 내 캐릭터별 남은 보스 |
| 내 캐릭터 | 등록/삭제, 환산·갱신시각, 수동 갱신 요청, 주간 목표 체크 그리드 |
| 코스 | 코스 생성(보스 순서 드래그), 멤버 추천/초대, 시간 히트맵, 공유 텍스트 |
| 스케줄 | 가능 시간 등록 (로아 프로젝트 기능 이식) |
| 전체 현황 | 사람 × 캐릭터 × 보스 매트릭스 (누가 어디 비었는지) |

---

## 8. 마일스톤

| 단계 | 내용 | 완료 조건 |
|---|---|---|
| M0 | 리포 생성, 문서, Next.js+Supabase 스캐폴드, CI | 빈 앱 배포 + 테스트 통과 |
| **S1 (스파이크)** | maplescouter 수집 방식 조사 (ADR-0002 미결 항목) | 닉네임 → 환산값 추출 PoC 또는 불가 판정 |
| M1 | 멤버/캐릭터 등록, 넥슨 API 기본정보, Discord 로그인 | 캐릭 등록 시 직업/레벨 자동 |
| M2 | 보스 설정 파일, 주간 목표, 주차 계산 | 주차 단위 목표 저장/리셋 |
| M3 | 코스 CRUD, 멤버 배정, 충돌 검사 | 체인 생성 + 규칙 위반 차단 |
| M4 | 스펙 배치 수집(S1 결과 반영) | 하루 1회 자동 갱신 |
| M5 | 추천 로직, 가능 시간 히트맵, 공유 텍스트 | 추천 목록 + 시간 확정 |
| M6 | 클리어 체크, Realtime, 모바일 다듬기 | 실사용 |

S1은 M1~M3와 병행 가능 (수집 모듈을 인터페이스로 분리했기 때문).

---

## 9. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| maplescouter 수집 불가/약관 금지 | 핵심 기능 | 저빈도·캐시로 부하 최소화, 대체로 수동 입력 유지, 공급자 교체 가능 구조 |
| 사이트 구조 변경 | 수집 중단 | 실패 시 이전 값 유지 + 갱신시각 표시, 실패 알림 |
| 보스 목록/인원/초기화 규칙 변경 | 잘못된 제한 | 설정 파일화, 확인일 기록 |
| 넥슨 API 호출 제한 | 등록 지연 | 캐시, 배치 간격 |

---

## 10. 미확인 사항 (구현 전 확인)

- [ ] maplescouter 내부 데이터 경로 / 차단 여부 / 약관 (현재 작업 환경에서 접속 차단되어 미확인)
- [ ] 넥슨 Open API 엔드포인트·필드·호출 제한 — 공식 문서(openapi.nexon.com)로 확인
- [ ] 주간 보스 초기화 요일·시각 — 목요일 0시(KST)로 알고 있으나 이번 조사로 검증 못함
- [ ] 2026-06-18 업데이트의 "일일/주간 컨텐츠 개편" 내용이 주간 보스 규칙에 주는 영향
- [ ] 보스별 난이도·최대 파티 인원 목록 (스우, 흉성, 카링 등)
- [ ] "같은 사람의 캐릭 2개가 한 코스" 허용 여부 — 사용자 정책 결정

## 참고 출처
- 메이플스카우터 GitHub 조직(공개 리포 없음, 연락처 기재): https://github.com/Maplescouter
- 인벤 — 환산 주스탯 웹사이트 리뉴얼 안내: https://www.inven.co.kr/board/maple/2304/37037
- NEXON Open API 메이플스토리: https://openapi.nexon.com/ko/game/maplestory/
- 넥슨 API 경로/상수(서드파티 코드): https://glama.ai/mcp/servers/@ljy9303/maplestory-mcp-server/blob/60a9ccabd3ea898f434fd77416a0c04e132b0313/src/api/constants.ts
- 2026-06-18 업데이트 공지: https://maplestory.nexon.com/news/update/806
