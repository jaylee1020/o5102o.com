# ASCII Camera View

전시 환경을 기준으로 카메라 영상을 ASCII 타일로 변환하고, 손 추적 숫자 패널을 덧씌우는 정적 웹앱입니다.

## 실행

정적 파일 서버에서 실행해야 ES modules, wasm, model asset이 정상 로드됩니다.

```bash
cd /Users/ijuyeong/Desktop/전시7
python3 -m http.server 8000
```

브라우저에서 `http://127.0.0.1:8000/` 을 엽니다.

## 오프라인 자산

- MediaPipe runtime: `vendor/mediapipe/tasks-vision/`
- Hand landmarker model: `assets/models/hand_landmarker.task`

외부 CDN 없이 위 로컬 자산만 사용합니다.

## 런타임 상태

- 정상 동작 중에는 추가 UI를 띄우지 않습니다.
- 카메라 권한 거부, 카메라 미지원, 모델 로드 실패 시에만 최소 오버레이를 표시합니다.
- 손 추적 결과는 최근 프레임 위치와 handedness를 기준으로 재매칭해 좌우 손 순서가 바뀌어도 패널이 덜 튀도록 보정합니다.

## Python helper

문자 빈도 분석 스크립트는 기본 JSON 출력 형태를 유지하면서 `--input` 인자를 지원합니다.

```bash
python3 analyze_book_chars.py --input /path/to/book.md
```

`--input` 을 생략하면 아래 순서로 `book.md` 를 찾습니다.

- 현재 작업 디렉터리의 `book.md`
- 스크립트 파일 옆의 `book.md`
- 기존 레거시 절대 경로

## 전시 체크리스트

- 정적 서버로 실행한다.
- 브라우저 카메라 권한을 허용한다.
- 네트워크 없이도 `vendor/` 와 `assets/` 만으로 부팅되는지 확인한다.
- 두 손을 동시에 비췄을 때 숫자 패널과 색상이 손 사이에서 바뀌지 않는지 확인한다.
- 창 크기 변경 후에도 렌더링이 유지되는지 확인한다.
