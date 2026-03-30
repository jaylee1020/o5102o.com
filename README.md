# o5102o.com

개인 사이트 모음입니다. 빌드 단계 없이 정적 HTML, 공용 CSS/JS, 그리고 소수의 API 함수만으로 운영합니다.

## 구조

```text
/                       메인 허브
├── by/                 포트폴리오
├── blog/               블로그 랜딩
├── card/               연락처 카드 + 폼
├── default/            인터랙티브 전시 앱
├── functions/api/      API 엔드포인트
├── shared/             공용 CSS/JS
├── _headers            캐시/보안 헤더
├── manifest.json       루트 PWA 매니페스트
└── sw.js               서비스워커
```

## 로컬 실행

정적 서버로 열어야 서비스워커, ES modules, 모델 파일이 정상 동작합니다.

```bash
cd /Users/ijuyeong/o5102o.com
python3 -m http.server 3000
```

브라우저에서 `http://127.0.0.1:3000/` 을 엽니다.

`default/` 전시 앱만 따로 확인하려면:

```bash
python3 -m http.server 8082 --directory default
```

## 편집 가이드

- `shared/base.css`는 메인, 카드, 포트폴리오, 블로그 페이지의 공통 레이아웃과 상호작용 스타일을 담당합니다.
- `shared/*.js`는 페이지별 동작과 서비스워커 등록을 담당합니다.
- `default/assets/index-*.js`는 빌드 결과물이라 직접 수정 시 파일명 해시를 반드시 바꿔야 합니다.
- `functions/api/contact.js`는 연락처 저장과 웹훅 알림을 처리합니다.
- `functions/api/wallet.js`는 아직 미구현 상태이며 현재는 vCard 폴백 신호만 반환합니다.

## default/ 전시 앱 주의사항

- 원본 소스는 현재 저장소에 없고, `default/assets/` 번들만 남아 있습니다.
- 번들을 수정하면 `_headers`의 immutable 캐시 때문에 파일명을 반드시 바꾸고 `default/index.html` 참조도 함께 갱신해야 합니다.
- MediaPipe 모델과 WASM 런타임은 모두 로컬 자산으로 동작합니다.

## 보조 스크립트

문자 빈도 분석:

```bash
python3 analyze_book_chars.py --input /path/to/book.md
```

`--input`을 생략하면 현재 디렉터리와 스크립트 옆의 `book.md`를 순서대로 찾습니다.
