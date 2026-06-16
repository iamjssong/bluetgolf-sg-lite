# BlueTgolf SG Lite MVP

PRD 기반의 모바일 앱 스타일 PWA MVP입니다. 샷별 기록 없이 스코어, 퍼트 수, 첫 퍼트 거리만으로 그린까지 SG와 퍼팅 SG를 분리합니다.

## 실행

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-server.ps1 -Port 4173
```

브라우저에서 `http://127.0.0.1:4173/`을 엽니다. `manifest.webmanifest`와 `sw.js`가 포함되어 있어 PWA 설치형 앱처럼 테스트할 수 있습니다.

## 포함 기능

- 핸디캡 조정 Hole Expected / Putt Expected 계산
- Green SG, Putting SG, Total SG 라운드 합산
- 앱 스타일 하단 탭: 입력, 리포트, 추이, 설정
- 첫 퍼트 거리 버킷 모드와 정확 입력 모드
- 홀별 실시간 SG 프리뷰 시트
- 모바일 우선 앱 쉘과 PWA 매니페스트/서비스워커
- PRD 필수 예제와 엣지케이스를 검증하는 브라우저 테스트

## 구조

```text
src/
  app.js
  styles.css
  domain/sg/
tests/
  browser-test.html
  browser-test.js
  sg.test.mjs
manifest.webmanifest
sw.js
icons/app-icon.svg
```
