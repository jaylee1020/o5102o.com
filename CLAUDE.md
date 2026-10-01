# CLAUDE.md — o5102o.com

## 프로젝트 구조

정적 사이트 (빌드 시스템 없음). 서브도메인별 폴더 구조:

```
/                          → o5102o.com (메인 허브, 한국어)
├── by/                    → by.o5102o.com (포트폴리오)
│   └── <slug>/            → 예전 상세 URL → /#<slug> 리다이렉트
├── blog/                  → blog.o5102o.com (블로그)
│   └── posts/             → 글 1개 = HTML 파일 1개 (no-build.html 복사해서 작성)
├── card/                  → card.o5102o.com (개발자 카드 + 연락처 폼)
├── default/               → default.o5102o.com (인터랙티브 전시)
│   ├── assets/            → 번들 JS/CSS (Vite 빌드 결과물, 소스 없음)
│   ├── models/            → MediaPipe 모델 (gesture_recognizer.task 사용, selfie_segmenter.tflite는 현재 미사용)
│   └── vendor/mediapipe/  → MediaPipe WASM 런타임 (오프라인용)
├── functions/api/         → Cloudflare Pages Functions (contact.js, wallet.js)
├── tools/                 → 일회성 개발 스크립트 (배포와 무관)
├── _headers               → 캐시/보안 헤더 (Cloudflare Pages 포맷)
└── manifest.json          → PWA 매니페스트
```

## 공용 셸 (site.css / site.js)

- 모든 공용 페이지는 `https://o5102o.com/site.css?v=8`, `https://o5102o.com/site.js?v=8`를 메인 도메인 절대 경로로 씁니다(서브도메인에서 `/site.css`가 해당 폴더로 매핑되어 스타일이 빠지는 문제 방지). 캐시 정책을 바꾸면 버전 쿼리와 `sw.js`의 precache 목록을 함께 올립니다.
- `site.js`의 인터랙션은 전부 data 속성으로 켜집니다: `.brand[data-scramble]`(이름 스크램블), `[data-scramble-once]`(404), `a.row[data-preview]`(호버 미리보기 / 터치 인라인 썸네일), `[data-clock]`(서울 시계), `a[data-copy]`(이메일 복사), `button[data-card]`(명함 뒤집기·기울기), `[data-progress]`(읽기 진행 선).
- 규칙: 짧고 빠르게(≤400ms), `prefers-reduced-motion`이면 즉시, 터치에서는 호버 대신 탭/로드 시 동작, JS 없이도 페이지가 완전히 읽혀야 합니다. 외부 라이브러리·폰트·CDN은 쓰지 않습니다.
- 프로젝트 상세는 별도 페이지가 아니라 `by/index.html` 안의 `<details class="project" id="<slug>">`로 펼쳐집니다(링크: `https://by.o5102o.com/#<slug>`). `by/<slug>/index.html`은 예전 URL 호환용 리다이렉트만 남깁니다. 내용은 각 저장소 README와 기존 사이트 문구에서만 가져옵니다. 추가 시 포트폴리오 목록과 루트 Work 목록을 함께 갱신합니다.

## default/ 전시 앱 (파티클 포스터)

### 핵심 구조
- **소스 파일 없음** — `default/src/`는 빌드 후 삭제됨. 원본 소스는 git 히스토리 `897b927` 커밋에만 존재
- **번들 직접 수정** — `default/assets/index-*.js`를 직접 편집해야 함 (미니파이드)
- 원본 소스 참조: `git show 897b927:default/src/lib/particlePoster.js`

### 미니파이드 함수명 매핑
| 원본 | 미니파이드 | 설명 |
|---|---|---|
| `makeVariation` | `Fh` | 변형 파라미터 생성 (폰트, 색상, 간격 등) |
| `renderVariationToParticles` | `$h` | 텍스트→파티클 변환 (offscreen canvas 샘플링) |
| `createParticlePosterEngine` | `e5` | 파티클 엔진 팩토리 (물리/렌더링 루프) |
| `buildWordLayouts` | `qv` | 텍스트 박스 레이아웃 계산 |
| `wrapWords` | `Qv` | 줄바꿈 처리 |
| `generatePalette` | `Hv` | WCAG 기반 색상 팔레트 생성 |
| `getOffscreen` | `Zv` | 오프스크린 캔버스 싱글턴 |
| `drawRoundRect` | `Jv` | 라운드 사각형 경로 |
| `drawSpacedText` | `Xv` | 자간 적용 텍스트 렌더링 |
| `parseHexToRGB` | `ua` | 16진수→RGB 배열 |
| `lerpColor` | `Gv` | 색상 보간 |
| `clamp` | `Go` | 값 범위 제한 |
| `randomFrom` | `aa` | 배열에서 랜덤 선택 |
| `randomInt` | `dn` | 정수 랜덤 |
| `randomFloat` | `no` | 실수 랜덤 |
| `lerp` | `Pe` | 선형 보간 |
| `getScreenScale` | `Z3` | 화면 크기 기반 스케일 계수 |
| App 컴포넌트 | `t5` | React 앱 루트 (카메라, 손 인식, 파티클) |
| `createMosaicCompositor` | `zv` | 아스키 아트 합성기 (**미사용** — 아래 참고) |

### Apple Silicon 최적화 (현재 적용됨)
- WebGL `UNMASKED_RENDERER_WEBGL`로 Apple GPU 감지
- `hardwareConcurrency`로 코어 수 기반 티어 분류:
  - **ultra**: M칩 8코어+ (간격 0.85-1.55, 반발 190px)
  - **high**: Apple 그 외 (간격 0.9-1.7, 반발 180px)
  - **default**: 비-Apple (간격 1.5-2.5, 반발 140px)
  - 간격은 짧은 변 기준(≤375/≤480/≤768/≤1024/그 이상). 모바일·태블릿은 예전보다 촘촘(파티클 약 2배), 데스크톱은 그대로
- 전역 변수: `window.__APPLE_SILICON`, `window.__PERF_TIER`

### 프레임 게이팅 최적화 (현재 적용됨)
- **비디오 프레임 게이팅**: `requestVideoFrameCallback`(폴백: rAF 타임스탬프 31ms 스로틀)으로 새 카메라 프레임이 있을 때만 제스처(손) 인식 실행 (`_nfF`, `_rvfc`, `_vfc` 변수)
- **WebGL 파티클 렌더러**: `e5`가 `webgl` 컨텍스트로 `gl.POINTS` 한 번에 그림(원형 AA는 프래그먼트 셰이더). 위치는 매 프레임 Float32Array로 업로드, 색은 `n.particles` 배열이 바뀔 때만 업로드. WebGL 사용 시 색 정렬(`_glOn`) 생략. 셰이더 링크 실패 시 캔버스를 교체하고 기존 2D arc 경로로 폴백. 컨텍스트 손실/복구 처리 포함
  - 셰이더 uniform 정밀도는 VS/FS가 같아야 함(`uniform mediump float S`) — 다르면 링크 실패
  - 배경은 기존 2D 결과와 동일하게 `clearColor = bg * trailAlpha` (alpha:false 캔버스에 clearRect→검정 위에 반투명 fill 하던 결과)
- **파티클 스킵 없음**: FPS 거버너가 `setParticleSkip`을 불러도 무시(no-op) — 파티클을 솎아내지 않음
- **모자이크/세그멘테이션 제거**: 파티클 캔버스가 불투명이라 그 아래 아스키 모자이크 레이어는 원래 화면에 보이지 않았음. 그런데 프레임당 수십~수백 ms를 쓰고 있었으므로 `zv`·`Mv` 초기화와 `segmentation-layer` 캔버스를 제거(코드는 번들에 남아 있음)
- **카메라 720p**: 카메라는 손 인식에만 쓰이므로 1280×720@30 요청 (손바닥 검출 입력이 192px라 그 이상은 낭비). 숨겨진 video의 CSS filter도 제거
- **파티클 루프**: `forEach` 클로저 → 인덱스 for 루프, 반발 강도 상수 호이스팅
- **백그라운드 탭**: `document.hidden`이면 12초 변형 재생성 스킵
- **손 반발 컬링**: 랜드마크 바운딩 박스(+반발 반경 `zl`) 밖 파티클은 랜드마크 루프를 건너뜀 (결과 동일)
- **FPS 거버너 갭 무시**: 2.5초 이상 프레임 공백(탭 복귀)은 저FPS로 판정하지 않음
- **리사이즈 디바운스**: 150ms, 크기 변화 없으면 무시 (모바일 주소창 resize 폭주로 포스터가 리셋되던 문제)

### 화면 매핑 / 조작 (현재 적용됨)
- **커버 크롭**: 비디오를 화면 비율에 맞춰 중앙 크롭(`object-fit: cover`와 동일)해서 손 랜드마크(`bv(hands, size, videoWidth, videoHeight)`)에 적용 (모자이크 `s4`에도 같은 크롭 코드가 있음). 예전엔 세로 화면에서 영상이 찌그러지고 손 위치가 어긋났음
- **다음 포스터**: 엔진 `next()` = 변형 재생성 + 12초 타이머 재시작. 트리거: Space/Enter/→ 키, ✌️(Victory) 제스처 약 0.2초 유지(쿨다운 3초). `F` 키는 전체화면
- **카메라 오류**: `NotAllowedError`/`NotFoundError`/`NotReadableError` 별로 다른 안내 문구

### 중요 주의사항

**⚠️ 캐시 버스팅 필수**: `_headers`에서 `/assets/*`가 `max-age=31536000, immutable`로 설정됨. 번들 수정 시 **반드시 파일명을 변경**해야 CDN 캐시가 갱신됨.
```bash
# 파일명 변경 절차
NEW_HASH=$(md5sum default/assets/index-OLD.js | cut -c1-8)
mv default/assets/index-OLD.js "default/assets/index-${NEW_HASH}.js"
# default/index.html의 preload, stylesheet, script 참조도 모두 업데이트
```

**⚠️ 소수점 particleSpacing**: pixel index 계산 시 반드시 `|0`으로 floor 처리 필요.
```javascript
// 올바른: ((g|0)*r+(y|0))*4
// 잘못된: (g*r+y)*4  ← 소수점 spacing에서 엉뚱한 픽셀 참조
```

**⚠️ Canvas alpha**: 파티클 캔버스는 `alpha:false`(WebGL·2D 폴백 모두) 유지. 투명이면 아래 video/배경이 비침.

## 배포

- **호스팅**: Cloudflare Pages (정적 + Pages Functions)
- **도메인**: o5102o.com, by.o5102o.com, card.o5102o.com, blog.o5102o.com, default.o5102o.com
- **HTML 캐시**: `max-age=0, must-revalidate` (항상 최신)
- **Assets 캐시**: `immutable` (파일명 해시로 버전 관리)

## 로컬 실행

```bash
# 전체 사이트
npx serve -l 3000

# default 전시 앱만
python3 -m http.server 8082 --directory default
```

## Git 컨벤션

- 브랜치: `claude/<설명>-<sessionId>`
- 원격: `origin` → `github.com/jaylee1020/o5102o.com`
- 기본 브랜치: `main` (remote), `master` (local)
