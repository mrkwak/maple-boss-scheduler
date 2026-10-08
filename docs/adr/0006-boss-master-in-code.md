# ADR-0006: 보스 마스터 데이터는 코드 내 설정 파일

- 상태: 승인

## 배경
- 보스 종류·난이도·최대 인원은 업데이트마다 바뀔 수 있다.
- 지인용 소규모 앱이라 관리자 화면을 만드는 비용이 크다.

## 결정
- `lib/bosses.js`에 보스 목록을 둔다.
  ```js
  { id: 'swoo', name: '스우', difficulties: ['normal','hard','extreme'], maxParty: { normal: 6, ... }, cycle: 'weekly', verifiedAt: '2026-10-??' }
  ```
  (예시 값은 형식 설명용이며 실제 값이 아님 — 구현 시 공식 정보로 채우고 `verifiedAt` 기록)
- DB에는 `boss_id` + `difficulty` 문자열만 저장한다.

## 결과
- (+) 변경은 PR 하나로 끝나고 이력이 남음
- (−) 보스 추가 시 배포 필요 (지인용이라 감수)
