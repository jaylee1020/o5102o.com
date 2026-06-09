# o5102o.com

정적 사이트 저장소입니다. 빌드 시스템 없이 HTML, CSS, JavaScript와 서버리스 함수만으로 구성되어 있습니다.

## 구조

```text
/                      메인 허브
/by/                   포트폴리오
/blog/                 블로그 인덱스
/blog/posts/           블로그 글 (HTML 파일 1개 = 글 1개)
/card/                 개발자 카드 + 연락처 폼
/default/              인터랙티브 전시 앱
/functions/            서버리스 함수 (Cloudflare Pages Functions 규약)
/tools/                일회성 개발 스크립트 (배포와 무관)
/_headers              캐시/보안 헤더
/manifest.json         루트 PWA 매니페스트
/sw.js                 공용 서비스 워커
/site.js               공용 프런트엔드 유틸
```

## 블로그 글 쓰기

1. `blog/posts/no-build.html` 을 복사해 새 파일을 만든다 (예: `blog/posts/my-post.html`).
2. `<title>`, og 태그, 제목/날짜, 본문을 수정한다.
3. `blog/index.html` 목록 맨 위에 한 줄 추가한다:

```html
<a class="post" href="posts/my-post.html"><span>제목</span><span class="date">YYYY.MM.DD</span></a>
```

## 로컬 실행

루트에서 정적 서버 하나만 띄우면 전체 사이트를 확인할 수 있습니다.

```bash
python3 -m http.server 3000
```

`default/` 전시 앱만 따로 확인하려면:

```bash
python3 -m http.server 8082 --directory default
```

## default 전시 앱

- 원본 소스는 삭제되어 있고 현재는 `default/assets/index-*.js` 번들을 직접 관리합니다.
- MediaPipe 모델과 WASM 런타임은 `default/models/`, `default/vendor/mediapipe/` 아래에 있습니다.
- `default/assets/*` 는 장기 캐시되므로 번들을 수정하면 파일명도 함께 바꿔야 합니다.

## 배포 메모

- 정적 파일과 함수는 Netlify 기준으로 운영합니다.
- 주의: `functions/api/*.js` 는 Cloudflare Pages Functions 규약(`onRequestPost` 등)으로 작성되어 있습니다. Netlify Functions 와 규약이 다르므로, 실제 호스팅이 Netlify 라면 `/api/contact` 가 동작하지 않고 카드 폼은 메일 폴백으로 동작합니다. 호스팅 플랫폼 확인 필요.
- HTML은 즉시 재검증, 해시된 에셋은 immutable 캐시를 사용합니다.
- 서비스 워커를 사용하므로 캐시 정책 변경 시 `sw.js`의 캐시 이름도 함께 갱신해야 합니다.
