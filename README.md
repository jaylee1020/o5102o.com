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
/site.css              공용 Editorial Terminal 디자인 시스템
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

## 공용 사이트 셸

- `site.css`가 루트, 포트폴리오, 블로그, 카드, 404의 레이아웃·테마·반응형 스타일을 공유합니다.
- `site.js`가 테마 동기화, 링크의 테마 전달, 복사 버튼, 점진적 등장 효과를 담당합니다.
- 테마 ID `2–5`와 기존 색상은 호환성을 위해 유지합니다. `default` 전시는 독립된 작품이라 테마 전달 대상에서 제외합니다.
- HTML에서는 `?v=5`가 붙은 공용 CSS/JS URL을 사용해 기존 서비스 워커 캐시와 새 셸이 섞이지 않게 합니다.
- 블로그는 기존처럼 글 하나가 HTML 파일 하나이며 `blog/feed.xml`을 수동으로 함께 갱신합니다.

## 연락처 데이터

개편판의 `card/` 폼으로 새로 접수되는 이름·한국 휴대전화·만난 곳은 연락 목적으로 최대 90일 보관합니다. 새 연락처 레코드에는 원시 IP 주소와 국가 정보를 넣지 않습니다. API는 서버 측 입력 검증을 수행하고 `CONTACTS` KV의 1시간 만료 해시 키로 기본적인 남용을 완화합니다. Workers KV는 원자적 카운터가 아니므로 이 로직을 정확한 요청 제한으로 간주하면 안 됩니다.

> **배포 전 데이터 점검:** 이전 버전은 `CONTACTS` KV의 bare UUID 키에 원시 IP·국가를 포함한 레코드를 365일 TTL로 저장했습니다. 이 저장소의 코드는 외부 KV 데이터를 자동 삭제하지 않습니다. 운영자가 기존 키를 확인한 뒤 명시적으로 삭제하거나 90일 정책에 맞게 마이그레이션해야 새 개인정보 안내를 전체 보유 데이터에도 적용할 수 있습니다.

## 배포 메모

- 호스팅은 Cloudflare Pages 입니다. 정적 파일 + `functions/` 의 Pages Functions(`onRequestPost` 등 규약)로 운영합니다.
- 프로덕션에서는 Cloudflare WAF Rate Limiting Rule로 `/api/contact` 요청을 제한하거나 Turnstile을 추가합니다. Pages Functions에는 Workers의 Rate Limiting binding을 그대로 사용할 수 없습니다.
- `CONTACTS` KV 바인딩이 없으면 연락처 API는 의도적으로 `503`을 반환합니다. Cloudflare preview URL은 허용 Origin에 포함하지 않아 폼 제출이 `403`인 것이 정상입니다.
- `_headers` 파일로 캐시/보안 헤더를 관리합니다 (Cloudflare Pages가 직접 지원).
- HTML은 즉시 재검증, 해시된 에셋은 immutable 캐시를 사용합니다.
- 서비스 워커는 셸과 방문 페이지를 분리해 캐시하고, 테마 쿼리를 제외한 URL로 페이지를 정규화하며, 미저장 문서에는 `/offline.html`을 표시합니다. 캐시 정책 변경 시 `sw.js`의 캐시 이름과 한 버전만 유지하는 `RETAINED_CACHE_NAMES`도 함께 갱신합니다.
