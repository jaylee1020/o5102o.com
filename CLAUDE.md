# CLAUDE.md — o5102o.com

## 프로젝트 구조

정적 사이트 (빌드 시스템 없음). 서브도메인별 폴더 구조:

```
/                          → o5102o.com (메인 허브, 한국어)
├── by/                    → by.o5102o.com (포트폴리오)
├── blog/                  → blog.o5102o.com (블로그)
│   └── posts/             → 글 1개 = HTML 파일 1개 (no-build.html 복사해서 작성)
├── card/                  → card.o5102o.com (개발자 카드 + 연락처 폼)
├── default/               → default.o5102o.com (인터랙티브 전시)
│   ├── assets/            → 번들 JS/CSS (Vite 빌드 결과물, 소스 없음)
│   ├── models/            → MediaPipe 모델 (hand_landmarker.task 등)
│   └── vendor/mediapipe/  → MediaPipe WASM 런타임 (오프라인용)
├── functions/api/         → 서버리스 함수 (Cloudflare Pages 규약 — contact.js, wallet.js)
├── tools/                 → 일회성 개발 스크립트 (배포와 무관)
├── _headers               → 캐시/보안 헤더 (Netlify/Cloudflare 공용 포맷)
└── manifest.json          → PWA 매니페스트
```

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
| App 컴포넌트 | `t5` | React 앱 루트 (카메라, 세그멘테이션, 파티클) |
| `createMosaicCompositor` | `zv` | 아스키 아트 합성기 |

### Apple Silicon 최적화 (현재 적용됨)
- WebGL `UNMASKED_RENDERER_WEBGL`로 Apple GPU 감지
- `hardwareConcurrency`로 코어 수 기반 티어 분류:
  - **ultra**: M칩 8코어+ (간격 0.75-2, 반발 180px, 8초 주기)
  - **high**: A칩 6코어+ (간격 1-2.5, 반발 160px)
  - **default**: 비-Apple (간격 1.5-3, 반발 130px)
- 전역 변수: `window.__APPLE_SILICON`, `window.__PERF_TIER`

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

**⚠️ Canvas alpha**: 파티클 캔버스는 `getContext("2d",{desynchronized:true,alpha:false})` 필수. `alpha:true`면 배경이 투명해져 세그멘테이션 레이어가 비침.

## 배포

- **호스팅**: Netlify (정적 + Functions)
- **도메인**: o5102o.com, by.o5102o.com, card.o5102o.com, default.o5102o.com
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
