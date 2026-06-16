# BlueTgolf SG Lite MVP

PRD 기반의 모바일 앱 스타일 PWA MVP입니다. 샘플 스코어 없이 빈 라운드에서 시작하며, 코스를 선택한 뒤 홀별 스코어, 퍼트 수, 첫 퍼트 거리만 입력해 Green SG와 Putting SG를 분리합니다.

## 실행

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-server.ps1 -Port 4173
```

브라우저에서 `http://127.0.0.1:4173/`을 엽니다. `manifest.webmanifest`와 `sw.js`가 포함되어 있어 PWA 설치와 오프라인 캐시를 테스트할 수 있습니다.

## 포함 기능

- St.Andres Old, Pebble Beach, Augusta National, Carnoustie Golf Links, Oakmont Country Club 코스 XML 데이터
- 코스 선택 후 18홀 빈 스코어카드 생성
- 핸디캡 조정 기반 Hole Expected / Putt Expected 계산
- Green SG, Putting SG, Total SG 라운드 합산
- 앱 스타일 하단 탭: 입력, 리포트, 추이, 설정
- 첫 퍼트 거리 버킷 모드와 정확 입력 모드
- 홀별 실시간 SG 프리뷰 시트
- 모바일 우선 UI와 PWA 매니페스트, 서비스 워커

## 구조

```text
data/
  courses.xml
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
