# Desktop Pet — 릴리스 · 랜딩 · 피드백

macOS 메뉴바 데스크톱 펫 **Desktop Pet**의 공개 배포 저장소입니다. 소스는 비공개이고, 이 저장소에는 설치 파일(Releases), 자동 업데이트 피드(`latest.json`), 랜딩 페이지(`docs/`)가 있습니다.

- 랜딩 페이지: https://kimtaekgwan.github.io/desktop-pet-releases/
- 업데이트 내역: https://kimtaekgwan.github.io/desktop-pet-releases/whats-new/
- 다운로드: [Releases](https://github.com/KimTaekGwan/desktop-pet-releases/releases/latest)
- 버그·제안: [Issues](https://github.com/KimTaekGwan/desktop-pet-releases/issues/new/choose) — 앱의 설정 → 일반 → "문제 보고…"를 누르면 환경 정보가 클립보드에 복사됩니다.

## 설치

1. Releases에서 `DesktopPet-<버전>.zip`을 받아 풀고 `DesktopPet.app`을 `응용 프로그램`(또는 `~/Applications`)에 옮깁니다.
2. 첫 실행 때 "확인되지 않은 개발자" 경고가 뜨면 **우클릭 → 열기**를 하거나 터미널에서 아래를 실행합니다(앱은 Developer ID로 서명돼 있지만 공증은 아직 안 했습니다).
   ```bash
   xattr -d com.apple.quarantine /Applications/DesktopPet.app
   ```
3. macOS 13 이상. 위젯은 macOS 14 이상.

## 자동 업데이트

앱이 하루에 한 번 이 저장소의 [`latest.json`](latest.json)만 읽습니다. 그 외에는 아무것도 보내지 않습니다.

---

*English*: Public release repo for **Desktop Pet**, a macOS menu-bar desktop pet that lives alongside your coding agents. Source is private. Download from Releases, read the landing page at the link above, and file issues here.
