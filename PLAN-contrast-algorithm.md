# 대비(Contrast) 알고리즘 개선 계획

## 현재 문제

`Hv()` 함수에서 색상 조합을 **무작위 배제** 방식으로 선택 중:
- canvas(배경), text(글자), boxes(박스) 색상이 서로 다르기만 하면 됨
- **WCAG 대비비 검증 없음** → 노란배경+흰글자 같은 저대비 조합 가능
- **상대 휘도(luminance) 계산 없음**
- 박스 배경 vs 텍스트 대비도 미보장

### 문제 발생 시나리오 예시
| canvas | text | boxes | 문제 |
|--------|------|-------|------|
| #ffe916 (노랑) | #ffffff (흰) | - | 대비비 ~1.2 (최소 4.5 필요) |
| #000000 (검정) | #0078bf (파랑) | #925f52 (갈색) | 박스배경 갈색+파랑글자 = 저대비 |

---

## 개선 계획

### Phase 1: 휘도 & 대비비 유틸 함수 추가

```javascript
// sRGB → 상대 휘도 (WCAG 2.1 공식)
function luminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// 대비비 계산 (1:1 ~ 21:1)
function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1), l2 = luminance(rgb2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

### Phase 2: `Hv()` 팔레트 선택 로직 교체

**현재:**
```
canvas = random(all)
text   = random(all - canvas)     ← 대비 미검증
boxes  = random(all - canvas - text)
```

**개선안:**
```
canvas = random(all)
text   = random(all - canvas) 중 contrastRatio(canvas, text) >= 4.5 인 것만
boxes  = random(all - canvas - text) 중 contrastRatio(box, text) >= 3.0 인 것만
```

구체적으로:
1. canvas 색상 랜덤 선택
2. 나머지 색상 중 canvas와 대비비 **≥ 4.5** (WCAG AA 기준)인 것만 text 후보로 필터링
3. 후보가 없으면 canvas 휘도에 따라 #000000 또는 #ffffff 강제 지정
4. boxes는 text와 대비비 **≥ 3.0** (대형 텍스트 기준)인 것만 필터링

### Phase 3: 박스 내부 텍스트 대비 보장

현재 모든 박스가 동일한 `palette.text` 색을 사용하지만, 박스 배경색마다 대비가 달라짐.

**개선안:**
- 각 박스마다 `boxTextColor` 를 개별 계산
- `contrastRatio(boxColor, paletteText) >= 4.5` → paletteText 사용
- 미달 시 → boxColor 휘도 기준으로 #000 또는 #fff 선택

```javascript
function boxTextColor(boxBg, preferredText) {
  if (contrastRatio(ua(boxBg), ua(preferredText)) >= 4.5) return preferredText;
  return luminance(ua(boxBg)) > 0.179 ? "#000000" : "#ffffff";
}
```

### Phase 4: 배경 전환 중간값 대비 보호

`Gv()`로 배경색이 보간되는 동안 중간 색상에서 대비가 떨어질 수 있음.

**개선안:**
- 전환 시작 전 중간 지점(t=0.5)의 보간색 대비비 확인
- 대비비 < 3.0이면 전환 경로를 수정 (검정/흰색 경유)하거나 텍스트에 미니멀 그림자 추가

### Phase 5: 하단 정보 바 대비 개선

`.current-text-block`의 `opacity: .7`이 대비를 추가로 약화시킴.

**개선안:**
- opacity 제거, 대신 배경에 `backdrop-filter: blur()` 또는 반투명 배경 적용
- 또는 opacity를 0.85 이상으로 상향

---

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `default/assets/index-BYpDMb72.js` | `Hv()`, `$h()`, `e5()` 내 색상 로직 |
| `default/assets/index-B0V9KlC0.css` | `.current-text-block` opacity |

## 우선순위

1. **Phase 1+2** (필수) — 가장 큰 임팩트. 저대비 조합 근본 차단
2. **Phase 3** (필수) — 박스별 텍스트 대비 보장
3. **Phase 5** (간단) — CSS 한 줄 수정
4. **Phase 4** (선택) — 전환 중 일시적 문제이므로 우선순위 낮음

## 예상 번들 크기 영향

- luminance/contrastRatio 함수: ~200 bytes (minified)
- 팔레트 선택 로직 변경: ~100 bytes 증가
- 총 영향: **~300 bytes** (무시 가능)
