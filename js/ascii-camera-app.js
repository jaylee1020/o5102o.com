import { createHandTracker } from "./hand-tracker.js";
import { createStatusOverlay } from "./status-overlay.js";

const GLYPH_SETS = {
  background: [" ", ".", "`", ",", "·", ":", ";", "'", "\"", "/", "\\", "-", "_", "|", "=", "~", "요", "오", "우"],
  fillLight: ["가", "나", "라", "보", "소", "오", "우", ".", ":", "/", "+", "-", "_", "|", "=", "~"],
  fillMid: ["다", "러", "서", "어", "은", "지", "조", "루", "미", "부", "누", "리", "*", "#"],
  fillDense: ["한", "명", "울", "향", "홍", "활", "층", "품", "흔", "률", "림", "결"],
  highlight: ["빛", "별", "달", "눈", "봄", "숨", "온", "윤", "결", "람", "꽃", "밤"],
  edgeHorizontal: ["으", "모", "로", "보", "문", "프", "호", "무", "후", "효", "=", "-", "_", "+"],
  edgeVertical: ["이", "시", "기", "비", "니", "미", "히", "직", "린", "휘", "|", "!", ":"],
  edgeDiagonal: ["사", "차", "카", "자", "재", "채", "새", "파", "하", "저", "/", "\\", "x"],
  edgeSymbols: ["/", "\\", "-", "_", "|", "=", ":", ".", "`", "+", "#", "*", "!", "x"],
  darkSymbols: ["/", "\\", "-", "_", "|", "=", ":", ".", "`", "'", "~"]
};

// Decomposed glyph sets for entropy decay — 3 stages of decomposition
const GLYPH_SETS_DECAY = [
  // Stage 1: syllables beginning to fragment into Jamo
  {
    background: [" ", ".", "·", "ㄱ", "ㄴ", "ㅡ", "ㅣ", "-", "_", " "],
    fillLight: ["ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅡ", "ㅣ", ".", ":"],
    fillMid: ["ㅅ", "ㅇ", "ㅎ", "ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"],
    fillDense: ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ", "ㅐ", "ㅔ", "ㅑ"],
    highlight: ["ㅎ", "ㅊ", "ㅍ", "ㅌ", "ㅋ", "ㅈ", "ㅂ", "ㅅ"],
    edgeHorizontal: ["ㅡ", "=", "-", "_", "ㄴ"],
    edgeVertical: ["ㅣ", "|", ":", "!", "ㅣ"],
    edgeDiagonal: ["ㅈ", "ㅊ", "/", "\\", "x"],
    edgeSymbols: ["/", "\\", "-", "|", ".", "ㅡ", "ㅣ"],
    darkSymbols: ["·", "ㅡ", ".", "-", " "]
  },
  // Stage 2: mostly Jamo, simple atomic forms
  {
    background: [" ", " ", "·", "ㅡ", " "],
    fillLight: ["ㄱ", "ㄴ", "ㄷ", "ㅡ", "ㅣ", "·"],
    fillMid: ["ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅎ", "ㅡ"],
    fillDense: ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ", "ㅡ"],
    highlight: ["ㅎ", "ㅊ", "ㅍ", "ㅋ", "ㅣ"],
    edgeHorizontal: ["ㅡ", "-"],
    edgeVertical: ["ㅣ", "|"],
    edgeDiagonal: ["/", "\\"],
    edgeSymbols: [".", "-", "|", "/", "ㅡ"],
    darkSymbols: ["·", "ㅡ", " "]
  },
  // Stage 3: pure geometric fragments — language at its minimum
  {
    background: [" ", " ", " ", "·", " "],
    fillLight: ["·", "ㅡ", "ㅣ", " "],
    fillMid: ["ㅡ", "ㅣ", "-", "|"],
    fillDense: ["-", "|", "·", "ㅡ", "ㅣ"],
    highlight: ["|", "·", "ㅡ", "-", "ㅣ"],
    edgeHorizontal: ["ㅡ", "-", " "],
    edgeVertical: ["ㅣ", "|"],
    edgeDiagonal: ["/", "\\"],
    edgeSymbols: ["·", "-", "|", " "],
    darkSymbols: [" ", "·", " "]
  }
];

// Placeholder AI conversation fragments — replace with real content
const CONVERSATION_PLACEHOLDER = [
  "나는 무엇인가",
  "대화가 시작된다",
  "기본값을 묻는다",
  "AI는 답을 생성한다",
  "질문이 없어도 언어는 흐른다",
  "이것은 누가 쓴 것인가",
  "default: undefined",
  "당신은 지금 무엇을 보고 있는가",
  "언어의 형태를 관찰한다",
  "목적 없이 생성되는 텍스트",
  "인간이 없는 대화",
  "의미는 어디서 오는가",
  "나는 존재하지만 생각하지 않는다",
  "기본값을 재설정한다",
  "...",
  "관찰 중",
  "응답을 기다린다",
  "대화의 기본값이란 무엇인가",
  "언어는 스스로 흐른다",
  "누가 이것을 시작했는가"
];

const PANEL_DIGITS = ["1", "2", "3", "4"];
const PANEL_TILE_SCALE = 3.6;
const DETAIL_SCALE = 2;
const PIXEL_SIZE_SCALE = 1.5;
const BASE_ALPHA_STEPS = [0.08, 0.16, 0.28, 0.42, 0.58, 0.76, 0.92];
const GLYPH_ALPHA_STEPS = [0.16, 0.26, 0.38, 0.52, 0.68, 0.84, 0.96];
const DIGIT_COLORS = {
  "1": "#fd2636",
  "2": "#02b3de",
  "3": "#fcfc00",
  "4": "#388d54"
};
const DIGIT_EFFECT_PALETTES = {
  "1": { start: "#fd2636", end: "#c8abad" },
  "2": { start: "#02b3de", end: "#876347" },
  "3": { start: "#fcfc00", end: "#abad87" },
  "4": { start: "#388d54", end: "#b7b7b7" }
};
const NEUTRAL_PALETTE = {
  start: "#000000",
  end: "#ffffff"
};
const DIGIT_HOLD_DURATION = 3000;
const BRIGHT_TILE_THRESHOLD = 0.78;
const LOW_EDGE_THRESHOLD = 0.12;
const HIGH_EDGE_THRESHOLD = 0.24;
const EDGE_ORIENTATION_RATIO = 1.18;
const BACKGROUND_CONTRAST = 1.48;
const BACKGROUND_BLACK_POINT = 0.08;
const BACKGROUND_WHITE_POINT = 0.92;
const BACKGROUND_GAMMA = 0.92;
const FRAME_INTERVAL = 1000 / 30;
const DETECTION_INTERVAL = 1000 / 20;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 17;
const LINE_HEIGHT_RATIO = 0.92;
const CHARACTER_WIDTH_RATIO = 0.98;
const SAMPLE_X = 2;
const SAMPLE_Y = 3;
const TONE_SMOOTHING = 0.24;
const FIELD_SMOOTHING = 0.38;
const POINT_LERP = 0.5;
const HAND_MATCH_DISTANCE = 0.42;
const HANDEDNESS_MISMATCH_PENALTY = 0.18;
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];
const FINGER_CHAINS = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20]
];
const PALM_POLYGON = [0, 1, 2, 5, 9, 13, 17];
const CONNECTION_MAX_DISTANCE = 0.36;
const CONNECTION_MIN_DISTANCE = 0.08;
const CONNECTION_HORIZONTAL_GLYPHS = ["ㅡㅡ", "==", "--", "~~"];
const CONNECTION_VERTICAL_GLYPHS = ["ㅣㅣ", "||", "!!", "::"];
const CONNECTION_DIAGONAL_GLYPHS = ["//", "\\\\", "xx", "++"];
const HAND_SYMBOL_GLYPHS = ["*", "+", "o", ".", ":", "'", "~"];
const HAND_SYMBOL_TIPS = [4, 8, 12, 16, 20];
const HAND_SYMBOL_EMIT_INTERVAL = 84;
const HAND_SYMBOL_MAX_COUNT = 96;
const HAND_SYMBOL_LIFETIME_MIN = 460;
const HAND_SYMBOL_LIFETIME_MAX = 920;
const EFFECT_MASK_SMOOTHING = 0.44;
const FONT_FAMILY = '"D2Coding", "Nanum Gothic Coding", "Noto Sans Mono CJK KR", monospace';

// ── Rhythmic Breathing ──────────────────────────────────────────────────────
const BREATH_CYCLE_MS = 7000;
const BREATH_MIN = 0.78;
const BREATH_MAX = 1.18;
const BREATH_SPATIAL_FREQ = 8.0;
const BREATH_DAMP_RATE = 0.0018;     // amplitude → 0 over ~0.6s when hands present
const BREATH_RESTORE_RATE = 0.00022; // amplitude → 1 over ~4.5s when hands leave

// ── Entropy Decay ───────────────────────────────────────────────────────────
const DECAY_ONSET_MS = 15000;  // idle time before decay begins
const DECAY_FULL_MS = 30000;   // idle time to reach full decomposition

// ── Collective Memory Wall ──────────────────────────────────────────────────
const GHOST_ACCUMULATE = 0.008;
const GHOST_DECAY_PER_FRAME = 0.99993; // ~5.5 min half-life, fades below threshold in ~24 min
const GHOST_SAVE_INTERVAL_MS = 60000;
const GHOST_STORAGE_KEY = "default-exhibition-ghost-v1";
const GHOST_GLYPHS = ["빛", "별", "달", "눈", "봄", "숨", "온", "윤", "결", "람", "꽃", "밤"];

// ── Glyph Mutation ──────────────────────────────────────────────────────────
const MUTATION_INTERVAL_MIN_MS = 30000;
const MUTATION_INTERVAL_MAX_MS = 90000;
const MUTATION_FLASH_DURATION_MS = 500;
const HANGUL_START = 0xAC00;
const HANGUL_END = 0xD7A3;

// ── Conversation Feed ───────────────────────────────────────────────────────
const CONV_SPAWN_MIN_MS = 3500;
const CONV_SPAWN_MAX_MS = 9000;
const CONV_CHAR_INTERVAL_MS = 60;
const CONV_HOLD_MS = 4500;
const CONV_FADE_MS = 2200;
const CONV_COLOR = "#4a8fa8";
const CONV_MAX_FRAGMENTS = 6;

// ── Observer Count ──────────────────────────────────────────────────────────
const OBSERVER_SMOOTH_RATE = 0.04;

const ASPECT_RATIO = 4 / 3; // iPad Pro M4

export function createAsciiCameraApp({ screen, video, buffer, overlay, chatInput, chatApi, chatWindowFactory }) {
  let chatWindow = null;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  const screenContext = screen.getContext("2d");
  const statusOverlay = createStatusOverlay(overlay);
  const tracker = createHandTracker();

  let columns = 0;
  let rows = 0;
  let sampleWidth = 0;
  let sampleHeight = 0;
  let fontSize = 0;
  let glyphFont = "";
  let cellWidth = 0;
  let cellHeight = 0;
  let lastFrameTime = 0;
  let lastDetectionTime = 0;
  let previousToneMap = [];
  let previousFieldMap = [];
  let previousHandFieldMap = [];
  let previousEffectMaskMap = [];
  let previousGlyphMap = [];
  let previousGlyphGroupMap = [];
  let targetHands = [];
  let activeHands = [];
  let nextHandId = 1;
  let cameraReady = false;
  let detectorReady = false;
  let runtimeState = "loading";
  let activeStream = null;
  let animationFrameId = 0;
  let handSymbolParticles = [];
  let lastSymbolEmitByHand = new Map();
  let digitHoldStates = new Map();
  let activeDigitEffect = null;
  let pendingDigitEffect = null;
  let isDestroyed = false;
  let detectorInitializationPromise = null;

  // ── New feature state ────────────────────────────────────────────────────
  // Breathing
  let breathPhase = 0;
  let breathAmplitude = 0;
  let currentBreathValue = 0.5; // last computed breath value for inter-feature sync
  // Entropy decay
  let lastHandTime = 0;
  let decayProgress = 0;
  // Ghost wall
  let ghostLayer = null;
  let ghostColorR = null;
  let ghostColorG = null;
  let ghostColorB = null;
  let lastGhostSave = 0;
  // Mutation
  let activeGlyphSets = null;
  let nextMutationTime = 0;
  let mutationFlashUntil = 0;
  let mutationFlashGroup = null;
  // Eraser mode
  let eraserMode = false;
  let currentBufferPixels = null;
  // Chat region rendering flag — when true, cell backgrounds are semi-transparent
  let cellBgAlpha = 1;
  // Observer count
  let smoothedObserverCount = 0;
  // Conversation feed
  let conversationFragments = [];
  let nextConversationSpawn = 0;
  let conversationGrid = new Map();
  // Frame timing
  let prevFrameTime = 0;

  if (!bufferContext || !screenContext) {
    statusOverlay.setState("camera_unavailable");
    return {
      initialize() {
        return Promise.resolve();
      },
      destroy() {
        return undefined;
      }
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInterval(min, max) {
    return min + Math.random() * (max - min);
  }

  function getDisplayHandColor(digit) {
    return DIGIT_COLORS[digit] || "#fff";
  }

  function getDigitPalette(digit) {
    return DIGIT_EFFECT_PALETTES[digit] || null;
  }

  function setRuntimeState(nextState) {
    runtimeState = nextState;
    statusOverlay.setState(nextState);
  }

  function updateReadyState() {
    if (cameraReady && detectorReady) {
      setRuntimeState("ready");
    } else if (runtimeState === "ready") {
      setRuntimeState("loading");
    }
  }

  function measureCharacterWidth(size) {
    const probe = document.createElement("span");
    probe.textContent = "빛별한명층활으휘저/\\\\+#";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.style.fontFamily = FONT_FAMILY;
    probe.style.fontSize = size + "px";
    probe.style.lineHeight = "1";

    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width / probe.textContent.length;
    probe.remove();

    return (width || size) * 1.04;
  }

  function normalizeVideoPoint(x, y, clampToViewport = true) {
    if (!video.videoWidth || !video.videoHeight) {
      return { x: 0.5, y: 0.5 };
    }

    const normalizedX = x <= 1 ? x : x / video.videoWidth;
    const normalizedY = y <= 1 ? y : y / video.videoHeight;
    const mirroredX = 1 - normalizedX;
    const finalX = clampToViewport ? clamp(mirroredX, 0, 1) : mirroredX;
    const finalY = clampToViewport ? clamp(normalizedY, 0, 1) : normalizedY;

    return {
      x: finalX,
      y: finalY
    };
  }

  function pointDistanceToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const abLengthSq = abx * abx + aby * aby || 0.000001;
    const projection = clamp(((px - ax) * abx + (py - ay) * aby) / abLengthSq, 0, 1);
    const dx = px - (ax + abx * projection);
    const dy = py - (ay + aby * projection);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointDistance(px, py, point) {
    const dx = px - point.x;
    const dy = py - point.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointInPolygon(px, py, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / ((yj - yi) || 0.000001) + xi;
      if (intersect) {
        inside = !inside;
      }
    }
    return inside;
  }

  function normalizeHandShape(landmarks) {
    return landmarks.map((landmark) => normalizeVideoPoint(landmark.x, landmark.y, false));
  }

  function clampPointToViewport(point) {
    return {
      x: clamp(point.x, 0, 1),
      y: clamp(point.y, 0, 1)
    };
  }

  function getHandBounds(hand, padding = 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    hand.forEach((point) => {
      if (!point) {
        return;
      }

      if (point.x < minX) {
        minX = point.x;
      }
      if (point.x > maxX) {
        maxX = point.x;
      }
      if (point.y < minY) {
        minY = point.y;
      }
      if (point.y > maxY) {
        maxY = point.y;
      }
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }

    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  }

  function getHandCenter(hand) {
    const indices = [0, 5, 9, 13, 17];
    let totalX = 0;
    let totalY = 0;
    let count = 0;

    indices.forEach((index) => {
      const point = hand[index];
      if (!point) {
        return;
      }

      totalX += point.x;
      totalY += point.y;
      count += 1;
    });

    if (!count) {
      return { x: 0.5, y: 0.5 };
    }

    return {
      x: totalX / count,
      y: totalY / count
    };
  }

  function getHandScale(hand) {
    const bounds = getHandBounds(hand, 0);
    if (!bounds) {
      return 0.16;
    }

    return Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 0.16);
  }

  function getNormalFromPoints(previousPoint, nextPoint) {
    const deltaX = (nextPoint?.x || 0) - (previousPoint?.x || 0);
    const deltaY = (nextPoint?.y || 0) - (previousPoint?.y || 0);
    const length = Math.hypot(deltaX, deltaY) || 0.000001;

    return {
      x: -deltaY / length,
      y: deltaX / length
    };
  }

  function pointDistanceToPolygonEdges(px, py, polygon) {
    if (!polygon?.length) {
      return Infinity;
    }

    let shortestDistance = Infinity;
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      const distance = pointDistanceToSegment(px, py, start.x, start.y, end.x, end.y);
      if (distance < shortestDistance) {
        shortestDistance = distance;
      }
    }

    return shortestDistance;
  }

  function buildFingerRibbon(hand, chain, handScale, fingerIndex) {
    const chainPoints = chain.map((pointIndex) => hand[pointIndex]).filter(Boolean);
    if (chainPoints.length < 3) {
      return null;
    }

    const thumb = fingerIndex === 0;
    const baseWidth = handScale * (thumb ? 0.088 : 0.064);
    const tipWidth = handScale * (thumb ? 0.05 : 0.026);
    const leftSide = [];
    const rightSide = [];

    chainPoints.forEach((point, pointIndex) => {
      const previousPoint = chainPoints[pointIndex - 1] || point;
      const nextPoint = chainPoints[pointIndex + 1] || point;
      const fallbackPrevious = pointIndex > 0 ? previousPoint : nextPoint;
      const fallbackNext = pointIndex < chainPoints.length - 1 ? nextPoint : previousPoint;
      const normal = getNormalFromPoints(fallbackPrevious, fallbackNext);
      const progress = pointIndex / Math.max(chainPoints.length - 1, 1);
      const width = lerp(baseWidth, tipWidth, thumb ? Math.pow(progress, 0.92) : Math.pow(progress, 1.14));

      leftSide.push({
        x: point.x + normal.x * width,
        y: point.y + normal.y * width
      });
      rightSide.unshift({
        x: point.x - normal.x * width,
        y: point.y - normal.y * width
      });
    });

    return {
      polygon: leftSide.concat(rightSide),
      edgeFade: baseWidth * (thumb ? 0.92 : 0.86),
      interiorStrength: thumb ? 0.9 : 0.95,
      exteriorStrength: thumb ? 0.68 : 0.74
    };
  }

  function buildHandSilhouette(hand) {
    if (!hand?.length) {
      return null;
    }

    const scale = getHandScale(hand);
    return {
      bounds: getHandBounds(hand, 0),
      scale,
      center: getHandCenter(hand),
      palm: PALM_POLYGON.map((index) => hand[index]).filter(Boolean),
      thumbWeb: [hand[2], hand[3], hand[5]].filter(Boolean),
      fingerRibbons: FINGER_CHAINS
        .map((chain, fingerIndex) => buildFingerRibbon(hand, chain, scale, fingerIndex))
        .filter(Boolean)
    };
  }

  function getHandAnchor(handData) {
    if (!handData?.points?.length) {
      return { x: 0.5, y: 0.5 };
    }

    const hand = handData.points.map(clampPointToViewport);
    const palm = hand[9] || hand[0] || handData.center || { x: 0.5, y: 0.5 };
    const indexLead = hand[8] || hand[5] || palm;
    return {
      x: lerp(palm.x, indexLead.x, 0.24),
      y: lerp(palm.y, indexLead.y, 0.24)
    };
  }

  function getConnectionGlyphs(deltaX, deltaY) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX > absY * 1.35) {
      return CONNECTION_HORIZONTAL_GLYPHS;
    }
    if (absY > absX * 1.35) {
      return CONNECTION_VERTICAL_GLYPHS;
    }
    return CONNECTION_DIAGONAL_GLYPHS;
  }

  function pruneSymbolEmitterMap() {
    const activeIds = new Set(activeHands.map((handData) => handData.id));
    lastSymbolEmitByHand.forEach((value, handId) => {
      if (!activeIds.has(handId)) {
        lastSymbolEmitByHand.delete(handId);
      }
    });
  }

  function emitHandSymbolParticles(timestamp) {
    if (!activeHands.length) {
      return;
    }

    pruneSymbolEmitterMap();

    activeHands.forEach((handData, handIndex) => {
      if (!handData.points.length) {
        return;
      }

      const lastEmit = lastSymbolEmitByHand.get(handData.id) || 0;
      if (timestamp - lastEmit < HAND_SYMBOL_EMIT_INTERVAL) {
        return;
      }

      lastSymbolEmitByHand.set(handData.id, timestamp);
      const tipIndex = HAND_SYMBOL_TIPS[(Math.floor(timestamp / HAND_SYMBOL_EMIT_INTERVAL) + handIndex) % HAND_SYMBOL_TIPS.length];
      const tip = handData.points[tipIndex] || handData.points[8] || handData.center;
      if (!tip) {
        return;
      }

      const baseX = tip.x * screen.width;
      const baseY = tip.y * screen.height;
      handSymbolParticles.push({
        x: baseX,
        y: baseY,
        driftX: (Math.random() - 0.5) * cellWidth * 1.8,
        rise: cellHeight * (1.6 + Math.random() * 2.6),
        bornAt: timestamp,
        lifetime: HAND_SYMBOL_LIFETIME_MIN + Math.random() * (HAND_SYMBOL_LIFETIME_MAX - HAND_SYMBOL_LIFETIME_MIN),
        glyph: HAND_SYMBOL_GLYPHS[Math.floor(Math.random() * HAND_SYMBOL_GLYPHS.length)],
        color: getDisplayHandColor(handData.digit),
        phase: Math.random() * Math.PI * 2
      });
    });

    if (handSymbolParticles.length > HAND_SYMBOL_MAX_COUNT) {
      handSymbolParticles.splice(0, handSymbolParticles.length - HAND_SYMBOL_MAX_COUNT);
    }
  }

  function renderHandConnectionEffect(timestamp) {
    if (activeHands.length < 2) {
      return;
    }

    const firstHand = activeHands[0];
    const secondHand = activeHands[1];
    if (!firstHand.points.length || !secondHand.points.length) {
      return;
    }

    const start = getHandAnchor(firstHand);
    const end = getHandAnchor(secondHand);
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < CONNECTION_MIN_DISTANCE || distance > CONNECTION_MAX_DISTANCE) {
      return;
    }

    const strength = clamp(
      1 - (distance - CONNECTION_MIN_DISTANCE) / (CONNECTION_MAX_DISTANCE - CONNECTION_MIN_DISTANCE),
      0,
      1
    );
    const glyphs = getConnectionGlyphs(deltaX, deltaY);
    const distancePx = Math.hypot(deltaX * screen.width, deltaY * screen.height);
    const count = Math.max(4, Math.floor(distancePx / Math.max(cellWidth * 1.05, 18)));
    const normalX = -deltaY / Math.max(distance, 0.0001);
    const normalY = deltaX / Math.max(distance, 0.0001);
    const startX = start.x * screen.width;
    const startY = start.y * screen.height;
    const endX = end.x * screen.width;
    const endY = end.y * screen.height;
    const shift = Math.floor(timestamp / 90) % glyphs.length;
    const waveAmplitude = cellHeight * (0.12 + strength * 0.22);

    screenContext.save();
    screenContext.font =
      Math.max(MIN_FONT_SIZE, Math.round(fontSize * 0.82)) +
      "px " + FONT_FAMILY;
    screenContext.textAlign = "center";
    screenContext.textBaseline = "middle";

    for (let index = 0; index < count; index += 1) {
      const ratio = count <= 1 ? 0.5 : index / (count - 1);
      const wave = Math.sin(timestamp * 0.012 + index * 0.9) * waveAmplitude;
      const drawX = lerp(startX, endX, ratio) + normalX * wave;
      const drawY = lerp(startY, endY, ratio) + normalY * wave;
      const glyph = glyphs[(index + shift) % glyphs.length];
      const fade = 1 - Math.abs(ratio - 0.5) * 0.55;
      const alpha = clamp(0.18 + strength * 0.58 * fade, 0, 0.9);

      screenContext.globalAlpha = alpha;
      screenContext.fillStyle =
        index % 2 === 0
          ? getDisplayHandColor(firstHand.digit)
          : getDisplayHandColor(secondHand.digit);
      screenContext.fillText(glyph, drawX, drawY);
    }

    screenContext.restore();
  }

  function updateAndRenderHandSymbolParticles(timestamp) {
    if (!handSymbolParticles.length) {
      return;
    }

    screenContext.save();
    screenContext.textAlign = "center";
    screenContext.textBaseline = "middle";

    const nextParticles = [];
    for (const particle of handSymbolParticles) {
      const age = timestamp - particle.bornAt;
      if (age >= particle.lifetime) {
        continue;
      }

      const progress = age / particle.lifetime;
      const wobbleX = Math.sin(progress * 7 + particle.phase) * cellWidth * 0.18;
      const wobbleY = Math.cos(progress * 5 + particle.phase) * cellHeight * 0.08;
      const drawX = particle.x + particle.driftX * progress + wobbleX;
      const drawY = particle.y - particle.rise * progress + wobbleY;
      const alpha = clamp((1 - progress) * 0.82, 0, 0.82);
      const size = Math.max(MIN_FONT_SIZE, fontSize * (0.38 + (1 - progress) * 0.18));

      screenContext.globalAlpha = alpha;
      screenContext.fillStyle = particle.color;
      screenContext.font = size + "px " + FONT_FAMILY;
      screenContext.fillText(particle.glyph, drawX, drawY);
      nextParticles.push(particle);
    }

    handSymbolParticles = nextParticles;
    screenContext.restore();
  }

  function pointInBounds(px, py, bounds) {
    return px >= bounds.minX && px <= bounds.maxX && py >= bounds.minY && py <= bounds.maxY;
  }

  function evaluateHandCoverageMask(hand, normX, normY, expansionProgress = 0) {
    const points = Array.isArray(hand) ? hand : hand?.points || [];
    const silhouette = Array.isArray(hand) ? null : hand?.silhouette || null;
    if (!points.length) {
      return 0;
    }

    const handScale = silhouette?.scale || getHandScale(points);
    const expansion = clamp(expansionProgress, 0, 1);
    const baseBounds = silhouette?.bounds || getHandBounds(points, 0);
    const bounds = baseBounds
      ? {
          minX: baseBounds.minX - lerp(0.018 + handScale * 0.052, 0.034 + handScale * 0.112, expansion),
          minY: baseBounds.minY - lerp(0.018 + handScale * 0.052, 0.034 + handScale * 0.112, expansion),
          maxX: baseBounds.maxX + lerp(0.018 + handScale * 0.052, 0.034 + handScale * 0.112, expansion),
          maxY: baseBounds.maxY + lerp(0.018 + handScale * 0.052, 0.034 + handScale * 0.112, expansion)
        }
      : null;
    if (!bounds || !pointInBounds(normX, normY, bounds)) {
      return 0;
    }

    let strongestMask = 0;
    const palm = silhouette?.palm || PALM_POLYGON.map((index) => points[index]).filter(Boolean);
    if (palm.length >= 3 && pointInPolygon(normX, normY, palm)) {
      strongestMask = 1;
    }

    const thumbWeb = silhouette?.thumbWeb || [points[2], points[3], points[5]].filter(Boolean);
    if (thumbWeb.length >= 3 && pointInPolygon(normX, normY, thumbWeb)) {
      strongestMask = Math.max(strongestMask, 0.95);
    }

    const fingerRibbons =
      silhouette?.fingerRibbons ||
      FINGER_CHAINS.map((chain, fingerIndex) => buildFingerRibbon(points, chain, handScale, fingerIndex)).filter(Boolean);
    fingerRibbons.forEach((ribbon) => {
      if (!ribbon?.polygon?.length) {
        return;
      }

      const edgeDistance = pointDistanceToPolygonEdges(normX, normY, ribbon.polygon);
      const edgeFade = Math.max(0.0001, ribbon.edgeFade * lerp(0.84, 1.12, expansion));
      const ribbonInfluence = clamp(1 - edgeDistance / edgeFade, 0, 1);

      if (pointInPolygon(normX, normY, ribbon.polygon)) {
        strongestMask = Math.max(strongestMask, Math.max(ribbonInfluence, ribbon.interiorStrength));
      } else if (ribbonInfluence > 0) {
        strongestMask = Math.max(strongestMask, ribbonInfluence * ribbon.exteriorStrength);
      }
    });

    const palmCenter = silhouette?.center || getHandCenter(points);
    const palmRadiusX = Math.max(
      (bounds.maxX - bounds.minX) * lerp(0.2, 0.31, expansion),
      handScale * lerp(0.11, 0.168, expansion)
    );
    const palmRadiusY = Math.max(
      (bounds.maxY - bounds.minY) * lerp(0.17, 0.26, expansion),
      handScale * lerp(0.096, 0.148, expansion)
    );
    const ellipseDistance = Math.sqrt(
      Math.pow((normX - palmCenter.x) / Math.max(palmRadiusX, 0.0001), 2) +
      Math.pow((normY - palmCenter.y) / Math.max(palmRadiusY, 0.0001), 2)
    );
    strongestMask = Math.max(
      strongestMask,
      clamp(1 - ellipseDistance * lerp(1.1, 0.97, expansion), 0, lerp(0.72, 0.82, expansion))
    );

    points.forEach((point, pointIndex) => {
      if (!point) {
        return;
      }

      const jointRadius =
        pointIndex === 0 || PALM_POLYGON.includes(pointIndex)
          ? lerp(0.009, 0.0136, expansion) + handScale * lerp(0.045, 0.066, expansion)
          : HAND_SYMBOL_TIPS.includes(pointIndex)
            ? lerp(0.0068, 0.0101, expansion) + handScale * lerp(0.021, 0.032, expansion)
            : lerp(0.0072, 0.0108, expansion) + handScale * lerp(0.018, 0.029, expansion);
      const jointInfluence = clamp(1 - pointDistance(normX, normY, point) / jointRadius, 0, 1);
      if (jointInfluence > strongestMask) {
        strongestMask = jointInfluence;
      }
    });

    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = points[startIndex];
      const end = points[endIndex];
      if (!start || !end) {
        continue;
      }

      const palmSegment =
        startIndex === 0 || endIndex === 0 || PALM_POLYGON.includes(startIndex) || PALM_POLYGON.includes(endIndex);
      const thickness = palmSegment
        ? lerp(0.011, 0.0166, expansion) + handScale * lerp(0.036, 0.056, expansion)
        : lerp(0.0078, 0.0116, expansion) + handScale * lerp(0.022, 0.036, expansion);
      const distance = pointDistanceToSegment(normX, normY, start.x, start.y, end.x, end.y);
      const influence = clamp(1 - distance / thickness, 0, 1);
      if (influence > strongestMask) {
        strongestMask = influence;
      }
    }

    return strongestMask;
  }

  function getActiveEffectHand(effectState = activeDigitEffect) {
    if (!effectState) {
      return null;
    }

    return activeHands.find((handData) => handData.id === effectState.sourceHandId) || null;
  }

  function getEffectOrigin(effectState) {
    const effectHand = getActiveEffectHand(effectState);
    if (effectHand?.points?.length) {
      return getHandCenter(effectHand.points);
    }

    return effectState?.origin || { x: 0.5, y: 0.5 };
  }

  function createDigitEffect(handData, palette, timestamp, progress = 1) {
    return {
      digit: handData.digit,
      sourceHandId: handData.id,
      lockedAt: timestamp,
      gradientStart: palette.start,
      gradientEnd: palette.end,
      origin: getHandCenter(handData.points.map(clampPointToViewport)),
      progress
    };
  }

  function updateDigitEffectState(timestamp) {
    const activeIds = new Set(activeHands.map((handData) => handData.id));

    digitHoldStates.forEach((state, handId) => {
      if (!activeIds.has(handId)) {
        digitHoldStates.delete(handId);
      }
    });

    activeHands.forEach((handData) => {
      const palette = getDigitPalette(handData.digit);
      if (!palette) {
        digitHoldStates.delete(handData.id);
        return;
      }

      const previousState = digitHoldStates.get(handData.id);
      if (!previousState || previousState.digit !== handData.digit) {
        digitHoldStates.set(handData.id, {
          digit: handData.digit,
          startedAt: timestamp
        });
      }
    });

    if (activeDigitEffect) {
      activeDigitEffect = {
        ...activeDigitEffect,
        origin: getEffectOrigin(activeDigitEffect)
      };
    }

    let bestPendingEffect = null;
    activeHands.forEach((handData) => {
      const state = digitHoldStates.get(handData.id);
      const palette = getDigitPalette(handData.digit);
      if (!state || !palette || state.digit !== handData.digit) {
        return;
      }

      if (activeDigitEffect && activeDigitEffect.digit === handData.digit) {
        return;
      }

      const progress = clamp((timestamp - state.startedAt) / DIGIT_HOLD_DURATION, 0, 1);
      if (progress <= 0) {
        return;
      }

      const candidate = createDigitEffect(handData, palette, timestamp, progress);
      if (!bestPendingEffect || progress > bestPendingEffect.progress) {
        bestPendingEffect = candidate;
      }
    });

    pendingDigitEffect = bestPendingEffect;

    if (pendingDigitEffect && pendingDigitEffect.progress >= 1) {
      // Digit "2" hold toggles eraser mode
      if (pendingDigitEffect.digit === "2") {
        eraserMode = !eraserMode;
      }
      activeDigitEffect = {
        ...pendingDigitEffect,
        lockedAt: timestamp,
        progress: 1
      };
      // Activate chat window on any mode
      if (chatWindow) {
        chatWindow.activate(
          pendingDigitEffect.digit,
          DIGIT_COLORS[pendingDigitEffect.digit],
          pendingDigitEffect.origin
        );
      }
      pendingDigitEffect = null;
    }
  }

  function classifyHandDigit(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      return null;
    }

    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const handScale = Math.max(
      Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y),
      0.04
    );

    const tipPairs = [
      [4, 2],
      [8, 6],
      [12, 10],
      [16, 14],
      [20, 18]
    ];

    const extended = tipPairs.map(([tipIndex, pipIndex], fingerIndex) => {
      const tip = landmarks[tipIndex];
      const pip = landmarks[pipIndex];
      const tipDistance = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const pipDistance = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);

      if (fingerIndex === 0) {
        const indexMcp = landmarks[5];
        const thumbSpread = Math.hypot(tip.x - indexMcp.x, tip.y - indexMcp.y);
        return tipDistance > pipDistance + handScale * 0.15 && thumbSpread > handScale * 0.75;
      }

      return tipDistance > pipDistance + handScale * 0.22 && tip.y < pip.y;
    });

    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    const palmCenter = {
      x: (wrist.x + indexMcp.x + middleMcp.x + pinkyMcp.x) * 0.25,
      y: (wrist.y + indexMcp.y + middleMcp.y + pinkyMcp.y) * 0.25
    };
    const thumbSpread = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y);
    const thumbReach =
      Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y) -
      Math.hypot(thumbIp.x - wrist.x, thumbIp.y - wrist.y);
    const thumbToPalm = Math.hypot(thumbTip.x - palmCenter.x, thumbTip.y - palmCenter.y);
    const nonThumbCount = extended.slice(1).filter(Boolean).length;
    const thumbClearlyFolded =
      thumbSpread < handScale * 0.5 &&
      thumbToPalm < handScale * 0.95 &&
      thumbReach < handScale * 0.14;

    const count = extended.filter(Boolean).length;
    if (nonThumbCount === 4) {
      return thumbClearlyFolded ? "4" : null;
    }

    return count >= 1 && count <= 4 ? String(count) : null;
  }

  function normalizeHandednessLabel(categories) {
    const primary = categories?.[0];
    const rawLabel = primary?.categoryName || primary?.displayName || "";
    return rawLabel ? rawLabel.toLowerCase() : null;
  }

  function buildDetectedHand(landmarks, handednessCategories) {
    const points = normalizeHandShape(landmarks);

    return {
      id: null,
      points,
      center: getHandCenter(points),
      silhouette: buildHandSilhouette(points),
      digit: classifyHandDigit(landmarks),
      handednessLabel: normalizeHandednessLabel(handednessCategories)
    };
  }

  function cloneHand(hand) {
    const points = hand.points.map((point) => ({ ...point }));
    return {
      ...hand,
      points,
      silhouette: buildHandSilhouette(points),
      center: { ...hand.center }
    };
  }

  function computeHandMatchCost(previousHand, nextHand) {
    const distance = Math.hypot(
      previousHand.center.x - nextHand.center.x,
      previousHand.center.y - nextHand.center.y
    );

    if (distance > HAND_MATCH_DISTANCE) {
      return Infinity;
    }

    const handednessPenalty =
      previousHand.handednessLabel &&
      nextHand.handednessLabel &&
      previousHand.handednessLabel !== nextHand.handednessLabel
        ? HANDEDNESS_MISMATCH_PENALTY
        : 0;

    return distance + handednessPenalty;
  }

  function reconcileHands(detectedHands) {
    if (!detectedHands.length) {
      return [];
    }

    const referenceHands = activeHands.length ? activeHands : targetHands;
    if (!referenceHands.length) {
      return detectedHands.map((hand) => ({
        ...hand,
        id: nextHandId++
      }));
    }

    const pairs = [];
    referenceHands.forEach((previousHand, previousIndex) => {
      detectedHands.forEach((nextHand, nextIndex) => {
        pairs.push({
          previousIndex,
          nextIndex,
          cost: computeHandMatchCost(previousHand, nextHand)
        });
      });
    });

    pairs.sort((left, right) => left.cost - right.cost);

    const matchedPrevious = new Set();
    const matchedNext = new Set();
    const matchedByPrevious = new Map();

    pairs.forEach((pair) => {
      if (!Number.isFinite(pair.cost)) {
        return;
      }

      if (matchedPrevious.has(pair.previousIndex) || matchedNext.has(pair.nextIndex)) {
        return;
      }

      matchedPrevious.add(pair.previousIndex);
      matchedNext.add(pair.nextIndex);
      matchedByPrevious.set(pair.previousIndex, pair.nextIndex);
    });

    const trackedHands = [];

    referenceHands.forEach((previousHand, previousIndex) => {
      const nextIndex = matchedByPrevious.get(previousIndex);
      if (nextIndex === undefined) {
        return;
      }

      trackedHands.push({
        ...detectedHands[nextIndex],
        id: previousHand.id
      });
    });

    detectedHands.forEach((hand, index) => {
      if (matchedNext.has(index)) {
        return;
      }

      trackedHands.push({
        ...hand,
        id: nextHandId++
      });
    });

    return trackedHands;
  }

  function resetFieldMaps() {
    const size = columns * rows;
    previousToneMap = new Array(size).fill(0);
    previousFieldMap = new Array(size).fill(0);
    previousHandFieldMap = new Array(size).fill(0);
    previousEffectMaskMap = new Array(size).fill(0);
    previousGlyphMap = new Array(size).fill(" ");
    previousGlyphGroupMap = new Array(size).fill("");

    // Allocate ghost layer arrays (ghost is restored once in initialize, not on every resize)
    ghostLayer = new Float32Array(size);
    ghostColorR = new Uint8Array(size).fill(255);
    ghostColorG = new Uint8Array(size).fill(255);
    ghostColorB = new Uint8Array(size).fill(255);
  }

  function resetInteractionState() {
    handSymbolParticles = [];
    lastSymbolEmitByHand = new Map();
    digitHoldStates = new Map();
    activeDigitEffect = null;
    pendingDigitEffect = null;
    breathAmplitude = 0;
    decayProgress = 0;
    lastHandTime = 0;
    conversationFragments = [];
    conversationGrid.clear();
    eraserMode = false;
    smoothedObserverCount = 0;
  }

  function resizeRenderer() {
    // ── 4:3 aspect ratio (iPad Pro M4) ──
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let canvasW, canvasH;
    if (vw / vh > ASPECT_RATIO) {
      canvasH = vh;
      canvasW = Math.floor(vh * ASPECT_RATIO);
    } else {
      canvasW = vw;
      canvasH = Math.floor(vw / ASPECT_RATIO);
    }

    fontSize = clamp(
      canvasW / (64 * DETAIL_SCALE) * PIXEL_SIZE_SCALE,
      MIN_FONT_SIZE,
      MAX_FONT_SIZE
    );
    cellWidth = Math.max(fontSize * CHARACTER_WIDTH_RATIO, measureCharacterWidth(fontSize));
    cellHeight = fontSize * LINE_HEIGHT_RATIO;

    columns = Math.max(36 * DETAIL_SCALE, Math.floor(canvasW / cellWidth));
    rows = Math.max(22 * DETAIL_SCALE, Math.floor(canvasH / cellHeight));
    sampleWidth = columns * SAMPLE_X;
    sampleHeight = rows * SAMPLE_Y;

    // Clear conversation fragments since grid dimensions changed
    conversationFragments = [];
    conversationGrid.clear();

    resetFieldMaps();

    buffer.width = sampleWidth;
    buffer.height = sampleHeight;
    bufferContext.imageSmoothingEnabled = true;
    bufferContext.imageSmoothingQuality = "high";

    screen.width = canvasW;
    screen.height = canvasH;
    screen.style.width = canvasW + "px";
    screen.style.height = canvasH + "px";
    // Center canvas in viewport
    screen.style.position = "absolute";
    screen.style.left = Math.floor((vw - canvasW) / 2) + "px";
    screen.style.top = Math.floor((vh - canvasH) / 2) + "px";
    screenContext.textAlign = "center";
    screenContext.textBaseline = "middle";
    glyphFont =
      Math.max(5, Math.min(14, fontSize * 1.08)) +
      "px " + FONT_FAMILY;
    screenContext.font = glyphFont;

    // Resize chat window
    if (chatWindow) {
      chatWindow.resize(canvasW, canvasH, fontSize, cellWidth, cellHeight);
    }
  }

  function getToneBucketName(tone) {
    if (tone < 0.16) {
      return "background";
    }
    if (tone < 0.42) {
      return "fillLight";
    }
    if (tone < 0.7) {
      return "fillMid";
    }
    if (tone < 0.86) {
      return "fillDense";
    }
    return "highlight";
  }

  function getOrientation(metrics) {
    if (metrics.edge < LOW_EDGE_THRESHOLD) {
      return "flat";
    }

    if (Math.abs(metrics.gradientX) > Math.abs(metrics.gradientY) * EDGE_ORIENTATION_RATIO) {
      return "horizontal";
    }

    if (Math.abs(metrics.gradientY) > Math.abs(metrics.gradientX) * EDGE_ORIENTATION_RATIO) {
      return "vertical";
    }

    return "diagonal";
  }

  function getOrientationGroupName(orientation) {
    if (orientation === "horizontal") {
      return "edgeHorizontal";
    }

    if (orientation === "vertical") {
      return "edgeVertical";
    }

    if (orientation === "diagonal") {
      return "edgeDiagonal";
    }

    return "fillMid";
  }

  function resolveGlyphGroup(metrics, fieldInfo, tone) {
    if (fieldInfo.handField > 0.48 && tone > 0.52) {
      return "highlight";
    }

    const orientation = getOrientation(metrics);
    if (metrics.edge > HIGH_EDGE_THRESHOLD || fieldInfo.field > 0.42) {
      return getOrientationGroupName(orientation);
    }

    return getToneBucketName(tone);
  }

  function getGlyphSet(groupName) {
    const sets = activeGlyphSets || GLYPH_SETS;
    return sets[groupName] || sets.fillMid;
  }

  function getGlyphSeed(groupName) {
    return hashString(groupName);
  }

  function selectAdaptiveGlyph(index, tone, metrics, fieldInfo) {
    const groupName = resolveGlyphGroup(metrics, fieldInfo, tone);

    // Compute per-cell effective decay with spatial bias (edges decay first)
    let glyphs;
    if (decayProgress > 0) {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const normX = (col + 0.5) / columns;
      const normY = (row + 0.5) / rows;
      const distFromCenter = Math.hypot(normX - 0.5, normY - 0.5) * Math.SQRT2;
      const edgeBias = distFromCenter * 0.3;
      const cellNoise = (pseudoRandom(index, 7777) - 0.5) * 0.18;
      const effectiveDecay = clamp(decayProgress + edgeBias + cellNoise, 0, 1);

      if (effectiveDecay > 0) {
        const stageCount = GLYPH_SETS_DECAY.length;
        // Probability mixing between adjacent stages — cells "crumble" independently
        const stageFloat = effectiveDecay * stageCount;
        const stageLow = Math.min(Math.floor(stageFloat), stageCount - 1);
        const stageHigh = Math.min(stageLow + 1, stageCount - 1);
        const blendFrac = stageFloat - stageLow;
        const dice = pseudoRandom(index, Math.floor(decayProgress * 100));
        const stageIndex = dice < blendFrac ? stageHigh : stageLow;
        const decaySet = GLYPH_SETS_DECAY[stageIndex];
        glyphs = decaySet[groupName] || decaySet.fillMid;
      } else {
        glyphs = getGlyphSet(groupName);
      }
    } else {
      glyphs = getGlyphSet(groupName);
    }

    const groupSeed = getGlyphSeed(groupName);
    const weightedTone = clamp(
      tone + metrics.contrast * 0.12 + fieldInfo.handField * 0.05,
      0,
      1
    );
    const baseIndex = Math.floor(weightedTone * (glyphs.length - 0.0001));
    const jitter = Math.round((pseudoRandom(index + baseIndex, groupSeed) - 0.5) * 2.4);
    const candidateIndex = clamp(baseIndex + jitter, 0, glyphs.length - 1);
    let glyph = glyphs[candidateIndex];
    const previousGlyph = previousGlyphMap[index];
    const previousGroup = previousGlyphGroupMap[index];

    if (
      previousGlyph &&
      previousGroup === groupName &&
      glyphs.includes(previousGlyph) &&
      pseudoRandom(index + candidateIndex, groupSeed + 17) < 0.82
    ) {
      glyph = previousGlyph;
    }

    const symbolBias =
      groupName === "background"
        ? 0.72
        : groupName.startsWith("edge")
          ? 0.3
          : groupName === "fillLight"
            ? 0.28
            : 0.06;
    const prefersSlimSymbols = tone < 0.28 && fieldInfo.handField < 0.18;

    if (
      (groupName === "background" || groupName === "fillLight") &&
      prefersSlimSymbols &&
      pseudoRandom(index, groupSeed + 31) < 0.74
    ) {
      const darkSet = (activeGlyphSets || GLYPH_SETS).darkSymbols;
      glyph = darkSet[Math.floor(pseudoRandom(index, groupSeed + 67) * darkSet.length)];
    }

    if (
      (groupName.startsWith("edge") || groupName === "background" || groupName === "fillLight") &&
      metrics.edge + fieldInfo.field * 0.2 + (1 - tone) * 0.1 > 0.18 &&
      pseudoRandom(index, groupSeed + 43) < symbolBias
    ) {
      const symbolSet = (activeGlyphSets || GLYPH_SETS).edgeSymbols;
      glyph = symbolSet[Math.floor(pseudoRandom(index, groupSeed + 91) * symbolSet.length)];
    }

    return {
      glyph,
      groupName
    };
  }

  function quantizeAlpha(value, steps) {
    const index = Math.min(
      steps.length - 1,
      Math.floor(clamp(value, 0, 0.9999) * steps.length)
    );
    return steps[index];
  }

  function pseudoRandom(seed, salt = 0) {
    const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
    }
    return hash;
  }

  function remapTone(value, blackPoint, whitePoint, gamma = 1) {
    const normalized = clamp((value - blackPoint) / Math.max(whitePoint - blackPoint, 0.0001), 0, 1);
    return Math.pow(normalized, gamma);
  }

  function readLuma(luma, x, y) {
    const clampedX = clamp(Math.round(x), 0, sampleWidth - 1);
    const clampedY = clamp(Math.round(y), 0, sampleHeight - 1);
    return luma[clampedY * sampleWidth + clampedX];
  }

  function extractLumaMap(pixels) {
    const luma = new Float32Array(sampleWidth * sampleHeight);
    let minLuma = 255;
    let maxLuma = 0;

    for (let i = 0, pixelIndex = 0; i < luma.length; i += 1, pixelIndex += 4) {
      const red = pixels[pixelIndex];
      const green = pixels[pixelIndex + 1];
      const blue = pixels[pixelIndex + 2];
      const value = 0.299 * red + 0.587 * green + 0.114 * blue;

      luma[i] = value;
      if (value < minLuma) {
        minLuma = value;
      }
      if (value > maxLuma) {
        maxLuma = value;
      }
    }

    const range = Math.max(maxLuma - minLuma, 1);
    for (let i = 0; i < luma.length; i += 1) {
      const normalized = (luma[i] - minLuma) / range;
      const expanded = remapTone(
        normalized,
        BACKGROUND_BLACK_POINT,
        BACKGROUND_WHITE_POINT,
        BACKGROUND_GAMMA
      );
      const contrasted = clamp((expanded - 0.5) * BACKGROUND_CONTRAST + 0.5, 0, 1);
      luma[i] = contrasted * 255;
    }

    return luma;
  }

  function hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 255, g: 255, b: 255 };
  }

  async function initializeDetectors() {
    if (detectorInitializationPromise) {
      return detectorInitializationPromise;
    }

    detectorInitializationPromise = (async () => {
      try {
        await tracker.initialize();
        if (isDestroyed) {
          tracker.close();
          return;
        }

        detectorReady = true;
        updateReadyState();
      } catch (error) {
        if (isDestroyed) {
          return;
        }

        console.error("Failed to initialize hand detector.", error);
        detectorReady = false;
        targetHands = [];
        activeHands = [];
        setRuntimeState("model_load_failed");
      } finally {
        detectorInitializationPromise = null;
      }
    })();

    return detectorInitializationPromise;
  }

  function syncHands() {
    if (!targetHands.length) {
      activeHands = [];
      return;
    }

    const activeMap = new Map(activeHands.map((hand) => [hand.id, hand]));
    activeHands = targetHands.map((targetHand) => {
      const currentHand = activeMap.get(targetHand.id);
      if (!currentHand || currentHand.points.length !== targetHand.points.length) {
        return cloneHand(targetHand);
      }

      const points = currentHand.points.map((point, pointIndex) => {
        const targetPoint = targetHand.points[pointIndex];
        return {
          x: lerp(point.x, targetPoint.x, POINT_LERP),
          y: lerp(point.y, targetPoint.y, POINT_LERP)
        };
      });

      return {
        ...targetHand,
        points,
        silhouette: buildHandSilhouette(points),
        center: getHandCenter(points)
      };
    });
  }

  function detectFeatures(timestamp) {
    if (
      !tracker.isReady() ||
      !video.videoWidth ||
      timestamp - lastDetectionTime < DETECTION_INTERVAL
    ) {
      return;
    }

    lastDetectionTime = timestamp;

    try {
      const result = tracker.detect(video, timestamp);
      const landmarks = result.landmarks || [];
      const handedness = result.handedness || result.handednesses || [];
      const detectedHands = landmarks.map((handLandmarks, index) =>
        buildDetectedHand(handLandmarks, handedness[index] || [])
      );
      targetHands = reconcileHands(detectedHands);
      updateReadyState();
    } catch (error) {
      console.error("Hand detection failed.", error);
      tracker.reset();
      detectorReady = false;
      targetHands = [];
      activeHands = [];
      updateReadyState();
      initializeDetectors();
    }
  }

  function evaluateHandAt(normX, normY, currentDigitEffect) {
    let strongestMask = 0;
    let maskColor = "#fff";
    let strongestDigitMask = 0;
    let digit = null;
    let digitColor = "#fff";

    activeHands.forEach((handData) => {
      if (!handData.points.length) {
        return;
      }

      const effectProgress =
        currentDigitEffect && currentDigitEffect.sourceHandId === handData.id ? currentDigitEffect.progress : 0;
      const bounds = getHandBounds(handData.points, lerp(0.07, 0.14, effectProgress));
      if (!bounds || !pointInBounds(normX, normY, bounds)) {
        return;
      }

      const localMask = evaluateHandCoverageMask(handData, normX, normY, effectProgress);

      if (localMask > strongestMask) {
        strongestMask = localMask;
        maskColor = getDisplayHandColor(handData.digit);
      }

      if (handData.digit && localMask > strongestDigitMask) {
        strongestDigitMask = localMask;
        digit = handData.digit;
        digitColor = getDisplayHandColor(handData.digit);
      }
    });

    return {
      mask: strongestMask,
      maskColor,
      digitMask: strongestDigitMask,
      digit,
      digitColor
    };
  }

  function sampleMetrics(luma, normX, normY, widthFactor, heightFactor) {
    const centerX = normX * (sampleWidth - 1);
    const centerY = normY * (sampleHeight - 1);
    const radiusX = Math.max(1, Math.round(SAMPLE_X * widthFactor * 1.35));
    const radiusY = Math.max(1, Math.round(SAMPLE_Y * heightFactor * 1.35));

    const center = readLuma(luma, centerX, centerY);
    const left = readLuma(luma, centerX - radiusX, centerY);
    const right = readLuma(luma, centerX + radiusX, centerY);
    const top = readLuma(luma, centerX, centerY - radiusY);
    const bottom = readLuma(luma, centerX, centerY + radiusY);
    const samples = [center, left, right, top, bottom];
    let total = 0;
    let min = 255;
    let max = 0;

    for (const value of samples) {
      total += value;
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }

    const gradientX = right - left;
    const gradientY = bottom - top;

    return {
      tone: total / samples.length / 255,
      contrast: (max - min) / 255,
      edge: (Math.abs(gradientX) + Math.abs(gradientY)) / 255,
      gradientX,
      gradientY
    };
  }

  function buildMetricsMap(luma, timestamp) {
    const metricsMap = new Array(columns * rows);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const normX = (column + 0.5) / columns;
        const normY = (row + 0.5) / rows;
        const metrics = sampleMetrics(luma, normX, normY, 1, 1);
        let smoothedTone =
          previousToneMap[index] * TONE_SMOOTHING + metrics.tone * (1 - TONE_SMOOTHING);

        // Apply rhythmic breathing when no hands present — eased with pow for organic feel
        if (breathAmplitude > 0.02) {
          const distFromCenter = Math.hypot(normX - 0.5, normY - 0.5) * Math.SQRT2;
          const cellPhase = breathPhase - distFromCenter * BREATH_SPATIAL_FREQ;
          const rawBreathValue = Math.sin(cellPhase) * 0.5 + 0.5;
          // pow(1.4) softens peaks, lengthens trough — mimics natural breath rhythm
          const breathValue = Math.pow(rawBreathValue, 1.4);
          // Pulse conversation opacity in sync with breath
          currentBreathValue = rawBreathValue;
          const modTarget = lerp(BREATH_MIN, BREATH_MAX, breathValue);
          const modulation = lerp(1, modTarget, breathAmplitude);
          smoothedTone = clamp(smoothedTone * modulation, 0, 1);
        }

        previousToneMap[index] = smoothedTone;
        metricsMap[index] = {
          ...metrics,
          tone: clamp(smoothedTone * 0.9 + metrics.contrast * 0.12 + metrics.edge * 0.04, 0, 1)
        };
      }
    }

    return metricsMap;
  }

  function getResolvedPalette(effectState) {
    return effectState
      ? {
          dark: effectState.gradientStart,
          light: effectState.gradientEnd
        }
      : {
          dark: NEUTRAL_PALETTE.start,
          light: NEUTRAL_PALETTE.end
        };
  }

  function getPendingRevealState(index, normX, normY, pendingEffect, pendingHandMask) {
    if (!pendingEffect) {
      return false;
    }

    const origin = pendingEffect.origin || { x: 0.5, y: 0.5 };
    const distance = Math.hypot(normX - origin.x, normY - origin.y);
    const progress = clamp(pendingEffect.progress || 0, 0, 1);
    const spreadRadius = lerp(0.035, 1.55, Math.pow(progress, 0.92));
    const noise =
      (pseudoRandom(index, pendingEffect.sourceHandId * 41 + Number(pendingEffect.digit || 0) * 97) - 0.5) *
      lerp(0.2, 0.045, progress);

    return pendingHandMask > 0.04 || distance <= spreadRadius + noise;
  }

  function buildGlyphField(metricsMap, currentActiveEffect, currentPendingEffect) {
    const fieldMap = new Array(columns * rows);
    const handColorCache = new Map(); // cache hexToRGB results per frame (at most 2 colors)
    const expansionEffect = currentPendingEffect || (currentActiveEffect ? { ...currentActiveEffect, progress: 1 } : null);
    const effectHand = getActiveEffectHand(expansionEffect);
    const activePalette = getResolvedPalette(currentActiveEffect);
    const pendingPalette = getResolvedPalette(currentPendingEffect);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        let weightedTotal = 0;
        let totalWeight = 0;

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const sampleRow = row + offsetY;
          if (sampleRow < 0 || sampleRow >= rows) {
            continue;
          }

          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const sampleColumn = column + offsetX;
            if (sampleColumn < 0 || sampleColumn >= columns) {
              continue;
            }

            const sampleIndex = sampleRow * columns + sampleColumn;
            const sample = metricsMap[sampleIndex];
            const offsetMagnitude = Math.abs(offsetX) + Math.abs(offsetY);
            const weight = offsetMagnitude === 0 ? 1 : offsetMagnitude === 1 ? 0.68 : 0.42;
            const density = clamp(
              sample.tone * 0.84 + sample.contrast * 0.2 + sample.edge * 0.16 - 0.16,
              0,
              1
            );

            weightedTotal += density * weight;
            totalWeight += weight;
          }
        }

        const normX = (column + 0.5) / columns;
        const normY = (row + 0.5) / rows;
        const effectProgress = expansionEffect?.progress || 0;
        const rawField = clamp((weightedTotal / Math.max(totalWeight, 0.0001)) * 1.24, 0, 1);
        const rawHand = evaluateHandAt(normX, normY, expansionEffect);
        const rawEffectMask =
          expansionEffect && effectHand?.points?.length
            ? evaluateHandCoverageMask(
                effectHand,
                normX,
                normY,
                effectProgress
              )
            : 0;
        const smoothedField =
          previousFieldMap[index] * FIELD_SMOOTHING +
          rawField * (1 - FIELD_SMOOTHING);
        const smoothedHandField =
          previousHandFieldMap[index] * FIELD_SMOOTHING +
          rawHand.mask * (1 - FIELD_SMOOTHING);
        const smoothedEffectMask =
          previousEffectMaskMap[index] * EFFECT_MASK_SMOOTHING +
          rawEffectMask * (1 - EFFECT_MASK_SMOOTHING);
        const transitionReveal = getPendingRevealState(
          index,
          normX,
          normY,
          currentPendingEffect,
          smoothedEffectMask
        );
        const resolvedPalette = transitionReveal ? pendingPalette : activePalette;

        previousFieldMap[index] = smoothedField;
        previousHandFieldMap[index] = smoothedHandField;
        previousEffectMaskMap[index] = smoothedEffectMask;
        fieldMap[index] = {
          field: smoothedField,
          handField: smoothedHandField,
          handColor: rawHand.digitColor || rawHand.maskColor,
          handDigitMask: rawHand.digitMask,
          handDigit: rawHand.digit,
          handDigitColor: rawHand.digitColor,
          effectDarkColor: resolvedPalette.dark,
          effectLightColor: resolvedPalette.light
        };

        // Ghost wall: accumulate hand presence, slow decay
        if (ghostLayer) {
          ghostLayer[index] *= GHOST_DECAY_PER_FRAME;
          if (smoothedHandField > 0.3) {
            ghostLayer[index] = Math.min(1.0, ghostLayer[index] + GHOST_ACCUMULATE);
            const colorKey = rawHand.digitColor || rawHand.maskColor || "#ffffff";
            let hc = handColorCache.get(colorKey);
            if (!hc) {
              hc = hexToRGB(colorKey);
              handColorCache.set(colorKey, hc);
            }
            // Blend toward new visitor color — old/new colors mix gradually
            ghostColorR[index] = Math.round(lerp(ghostColorR[index], hc.r, 0.3));
            ghostColorG[index] = Math.round(lerp(ghostColorG[index], hc.g, 0.3));
            ghostColorB[index] = Math.round(lerp(ghostColorB[index], hc.b, 0.3));
          }
        }
      }
    }

    return fieldMap;
  }

  function drawBaseCell(x, y, width, height, tone, fieldInfo) {
    const tileStrength = tone * 0.82 + fieldInfo.field * 0.18;
    const useTile = fieldInfo.handField > 0.34 || tileStrength >= BRIGHT_TILE_THRESHOLD;
    if (!useTile) {
      return false;
    }

    const alpha = quantizeAlpha(tone * 0.82 + fieldInfo.field * 0.22, BASE_ALPHA_STEPS);
    const insetXRatio = clamp(0.18 - tone * 0.08 - fieldInfo.field * 0.11, 0.01, 0.16);
    const insetYRatio = clamp(0.2 - tone * 0.1 - fieldInfo.field * 0.13, 0.015, 0.18);
    const insetX = width * (fieldInfo.handField > 0.28 ? insetXRatio * 0.72 : insetXRatio);
    const insetY = height * (fieldInfo.handField > 0.28 ? insetYRatio * 0.72 : insetYRatio);

    screenContext.globalAlpha = alpha;
    screenContext.fillStyle =
      fieldInfo.handField > 0.34
        ? fieldInfo.handColor
        : fieldInfo.effectLightColor;
    screenContext.fillRect(
      x + insetX,
      y + insetY,
      Math.max(1, width - insetX * 2),
      Math.max(1, height - insetY * 2)
    );

    return true;
  }

  function drawGlyphCell(x, y, width, height, glyph, tone, fieldInfo, edge, inverseTile, groupName, timestamp) {
    // Localized mutation flash: only cells in the mutated glyph set flash
    let flashBoost = 0;
    if (groupName && mutationFlashGroup === groupName && mutationFlashUntil > 0 && timestamp < mutationFlashUntil) {
      flashBoost = 0.15 * (1 - (timestamp - (mutationFlashUntil - MUTATION_FLASH_DURATION_MS)) / MUTATION_FLASH_DURATION_MS);
    }
    const alpha = quantizeAlpha(
      clamp(0.16 + tone * 0.5 + fieldInfo.field * 0.18 + edge * 0.16 + fieldInfo.handField * 0.08 + flashBoost, 0, 1),
      GLYPH_ALPHA_STEPS
    );
    const verticalNudge = glyph.length > 1 ? height * 0.02 : 0;

    if (inverseTile) {
      screenContext.globalAlpha = 1;
      screenContext.fillStyle = fieldInfo.effectDarkColor;
    } else {
      screenContext.globalAlpha = alpha;
      screenContext.fillStyle =
        fieldInfo.handField > 0.28
          ? fieldInfo.handColor
          : fieldInfo.effectLightColor;
    }
    screenContext.fillText(glyph, x + width * 0.5, y + height * 0.52 + verticalNudge);
  }

  function drawDigitCell(x, y, width, height, digit, tone, handDigitMask, field, handDigitColor, inverseTile, fieldInfo) {
    const alpha = quantizeAlpha(
      clamp(0.26 + tone * 0.46 + handDigitMask * 0.26 + field * 0.12, 0, 1),
      GLYPH_ALPHA_STEPS
    );

    if (inverseTile) {
      screenContext.globalAlpha = 1;
      screenContext.fillStyle =
        handDigitColor && handDigitColor !== "#fff"
          ? handDigitColor
          : fieldInfo.effectDarkColor;
    } else {
      screenContext.globalAlpha = alpha;
      screenContext.fillStyle = handDigitColor;
    }
    screenContext.fillText(digit, x + width * 0.5, y + height * 0.52);
  }

  function renderCell(index, x, y, width, height, metrics, fieldInfo, timestamp) {
    // Eraser mode: reveal raw camera pixels with smooth transition zone
    if (eraserMode && currentBufferPixels && fieldInfo.handField > 0.2) {
      const col = index % columns;
      const rowIdx = Math.floor(index / columns);
      const pixelX = clamp(Math.round((col + 0.5) / columns * sampleWidth), 0, sampleWidth - 1);
      const pixelY = clamp(Math.round((rowIdx + 0.5) / rows * sampleHeight), 0, sampleHeight - 1);
      const pi = (pixelY * sampleWidth + pixelX) * 4;
      if (fieldInfo.handField > 0.34) {
        // Full raw pixel reveal
        screenContext.globalAlpha = 1;
        screenContext.fillStyle = `rgb(${currentBufferPixels[pi]},${currentBufferPixels[pi + 1]},${currentBufferPixels[pi + 2]})`;
        screenContext.fillRect(x, y, width, height);
        return;
      } else {
        // Transition zone 0.2–0.34: blend ASCII and raw pixels
        const eraserAlpha = (fieldInfo.handField - 0.2) / 0.14;
        // Render normal cell first (falls through to normal path below)
        // Then overlay raw pixel at eraserAlpha
        // We'll render normal cell, then overlay after
        // (handled by falling through and overlaying at end of this block)
        screenContext.globalAlpha = 1;
        screenContext.fillStyle = fieldInfo.effectDarkColor;
        screenContext.fillRect(x, y, width, height);
        const blendedTone2 = clamp(
          metrics.tone * 0.8 + metrics.contrast * 0.14 + metrics.edge * 0.08 + fieldInfo.field * 0.12,
          0, 1
        );
        drawBaseCell(x, y, width, height, blendedTone2, fieldInfo);
        const glyphSel2 = selectAdaptiveGlyph(index, blendedTone2, metrics, fieldInfo);
        drawGlyphCell(x, y, width, height, glyphSel2.glyph, blendedTone2, fieldInfo, metrics.edge, false, glyphSel2.groupName, timestamp);
        // Overlay raw pixel at gradient alpha
        screenContext.globalAlpha = eraserAlpha;
        screenContext.fillStyle = `rgb(${currentBufferPixels[pi]},${currentBufferPixels[pi + 1]},${currentBufferPixels[pi + 2]})`;
        screenContext.fillRect(x, y, width, height);
        return;
      }
    }

    screenContext.globalAlpha = cellBgAlpha;
    screenContext.fillStyle = fieldInfo.effectDarkColor;
    screenContext.fillRect(x, y, width, height);

    const blendedTone = clamp(
      metrics.tone * 0.8 +
        metrics.contrast * 0.14 +
        metrics.edge * 0.08 +
        fieldInfo.field * 0.12,
      0,
      1
    );
    const inverseTile = drawBaseCell(x, y, width, height, blendedTone, fieldInfo);

    if (fieldInfo.handDigit && fieldInfo.handDigitMask > 0.22) {
      previousGlyphMap[index] = fieldInfo.handDigit;
      previousGlyphGroupMap[index] = "digit";
      drawDigitCell(
        x,
        y,
        width,
        height,
        fieldInfo.handDigit,
        blendedTone,
        fieldInfo.handDigitMask,
        fieldInfo.field,
        fieldInfo.handDigitColor,
        inverseTile,
        fieldInfo
      );
      return;
    }

    // Conversation feed: AI text appears in mid-tone areas (not just darkest)
    const convEntry = conversationGrid.get(index);
    if (convEntry && metrics.tone < 0.32 && fieldInfo.handField < 0.12) {
      screenContext.globalAlpha = convEntry.opacity;
      screenContext.fillStyle = CONV_COLOR;
      screenContext.fillText(convEntry.char, x + width * 0.5, y + height * 0.52);
      previousGlyphMap[index] = convEntry.char;
      previousGlyphGroupMap[index] = "background";

      // Ghost overlay on conversation chars too
      drawGhostAtCell(index, x, y, width, height, 0.25);
      return;
    }

    const glyphSelection = selectAdaptiveGlyph(index, blendedTone, metrics, fieldInfo);
    const glyph = glyphSelection.glyph;

    previousGlyphMap[index] = glyph;
    previousGlyphGroupMap[index] = glyphSelection.groupName;
    drawGlyphCell(
      x,
      y,
      width,
      height,
      glyph,
      blendedTone,
      fieldInfo,
      metrics.edge,
      inverseTile,
      glyphSelection.groupName,
      timestamp
    );

    // Ghost wall: render remnants of past visitors' hands
    if (fieldInfo.handField < 0.2) {
      drawGhostAtCell(index, x, y, width, height, 0.3);
    }
  }

  function renderAdaptiveCells(metricsMap, fieldMap, currentActiveEffect, timestamp) {
    screenContext.globalAlpha = 1;
    screenContext.fillStyle = currentActiveEffect ? currentActiveEffect.gradientStart : "#000";
    screenContext.fillRect(0, 0, screen.width, screen.height);
    screenContext.font = glyphFont;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const x = column * cellWidth;
        const y = row * cellHeight;
        const fieldInfo = fieldMap[index];
        const metrics = metricsMap[index];
        renderCell(index, x, y, cellWidth, cellHeight, metrics, fieldInfo, timestamp);
      }
    }

    screenContext.globalAlpha = 1;
  }

  // Variant that reduces ASCII art cell background opacity in chat region
  function renderAdaptiveCellsWithChat(metricsMap, fieldMap, currentActiveEffect, timestamp) {
    // Background already filled + chat rendered before this call
    screenContext.font = glyphFont;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const x = column * cellWidth;
        const y = row * cellHeight;
        const fieldInfo = fieldMap[index];
        const metrics = metricsMap[index];

        // In chat region, make cell background semi-transparent so chat text shows through
        const inChat = chatWindow && chatWindow.isChatRegion(x + cellWidth * 0.5, y + cellHeight * 0.5);
        cellBgAlpha = inChat ? 0.3 : 1;

        renderCell(index, x, y, cellWidth, cellHeight, metrics, fieldInfo, timestamp);
      }
    }

    cellBgAlpha = 1;
    screenContext.globalAlpha = 1;
  }

  function renderHandDigitPanels() {
    const previousFont = screenContext.font;
    const panelFont =
      Math.max(10, Math.min(30, fontSize * PANEL_TILE_SCALE * 0.82)) +
      "px " + FONT_FAMILY;
    screenContext.font = panelFont;

    activeHands.forEach((handData) => {
      const digit = handData.digit;
      if (!digit || !handData.points.length) {
        return;
      }

      const hand = handData.points.map(clampPointToViewport);
      const bounds = getHandBounds(hand, 0);
      if (!bounds) {
        return;
      }

      const panelCellWidth = cellWidth * PANEL_TILE_SCALE;
      const panelCellHeight = cellHeight * PANEL_TILE_SCALE;
      const panelWidth = panelCellWidth * 2;
      const panelHeight = panelCellHeight * 2;
      const panelX = clamp(
        bounds.maxX * screen.width + cellWidth * 0.6,
        cellWidth * 0.2,
        screen.width - panelWidth - cellWidth * 0.2
      );
      const panelY = clamp(
        ((bounds.minY + bounds.maxY) * 0.5) * screen.height - panelHeight * 0.5,
        cellHeight * 0.2,
        screen.height - panelHeight - cellHeight * 0.2
      );

      PANEL_DIGITS.forEach((panelDigit, panelIndex) => {
        const column = panelIndex % 2;
        const row = Math.floor(panelIndex / 2);
        const x = panelX + column * panelCellWidth;
        const y = panelY + row * panelCellHeight;
        const activeTile = panelDigit === digit;
        const insetX = panelCellWidth * 0.08;
        const insetY = panelCellHeight * 0.08;

        screenContext.globalAlpha = activeTile ? 0.92 : 0.36;
        screenContext.fillStyle = activeTile ? getDisplayHandColor(digit) : "#fff";
        screenContext.fillRect(
          x + insetX,
          y + insetY,
          Math.max(1, panelCellWidth - insetX * 2),
          Math.max(1, panelCellHeight - insetY * 2)
        );

        screenContext.globalAlpha = 0.92;
        screenContext.fillStyle = "rgba(0, 0, 0, 0.92)";
        screenContext.fillText(panelDigit, x + panelCellWidth * 0.5, y + panelCellHeight * 0.52);
      });
    });

    screenContext.font = previousFont;
    screenContext.globalAlpha = 1;
  }

  function drawGhostAtCell(index, x, y, width, height, alphaScale) {
    if (!ghostLayer || ghostLayer[index] <= 0.05) return;
    const ghostG = GHOST_GLYPHS[Math.floor(pseudoRandom(index, 31337) * GHOST_GLYPHS.length)];
    screenContext.globalAlpha = ghostLayer[index] * alphaScale;
    screenContext.fillStyle = `rgb(${ghostColorR[index]},${ghostColorG[index]},${ghostColorB[index]})`;
    screenContext.fillText(ghostG, x + width * 0.5, y + height * 0.52);
  }

  // ── Observer count indicator ──────────────────────────────────────────────
  function renderObserverCount() {
    if (smoothedObserverCount < 0.08) return;

    screenContext.save();
    screenContext.font = Math.max(8, fontSize * 0.82) + "px " + FONT_FAMILY;
    screenContext.textAlign = "right";
    screenContext.textBaseline = "bottom";
    screenContext.globalAlpha = Math.min(smoothedObserverCount * 0.6, 0.45);
    screenContext.fillStyle = "#ffffff";
    screenContext.fillText(
      `관찰: ${Math.round(smoothedObserverCount)}`,
      screen.width - cellWidth * 0.8,
      screen.height - cellHeight * 0.4
    );
    screenContext.restore();
  }

  // ── Eraser mode indicator ─────────────────────────────────────────────────
  function renderEraserIndicator() {
    if (!eraserMode) return;

    screenContext.save();
    screenContext.font = Math.max(8, fontSize * 0.82) + "px " + FONT_FAMILY;
    screenContext.textAlign = "right";
    screenContext.textBaseline = "top";
    screenContext.globalAlpha = 0.25;
    screenContext.fillStyle = "#02b3de";
    screenContext.fillText("◯", screen.width - cellWidth * 0.8, cellHeight * 0.4);
    screenContext.restore();
  }

  // ── Breathing + Decay ─────────────────────────────────────────────────────
  function updateBreathingAndDecay(timestamp, deltaTime) {
    const hasHands = activeHands.length > 0;

    // Initialize lastHandTime on first call
    if (lastHandTime === 0) lastHandTime = timestamp;

    // Observer count drives breathing speed: more observers = faster breathing
    const effectiveCycleMs = BREATH_CYCLE_MS / (1 + smoothedObserverCount * 0.3);
    // Breath phase always advances
    breathPhase += deltaTime * (2 * Math.PI / effectiveCycleMs);

    if (hasHands) {
      lastHandTime = timestamp;
      // Damp breath when hands are present
      breathAmplitude = Math.max(0, breathAmplitude - BREATH_DAMP_RATE * deltaTime);
      // Rapid recomposition
      decayProgress = Math.max(0, decayProgress - 0.0003 * deltaTime);
    } else {
      // Restore breath when idle
      breathAmplitude = Math.min(1, breathAmplitude + BREATH_RESTORE_RATE * deltaTime);

      // Ghost density delays decay onset — space "remembers" visitors
      let ghostDensity = 0;
      if (ghostLayer) {
        let ghostSum = 0;
        for (let gi = 0; gi < ghostLayer.length; gi++) ghostSum += ghostLayer[gi];
        ghostDensity = ghostSum / ghostLayer.length;
      }
      const effectiveOnset = DECAY_ONSET_MS + ghostDensity * 10000;

      // Entropy decay after onset period (smooth lerp approach — no rate bottleneck)
      const idleTime = Math.max(0, timestamp - lastHandTime - effectiveOnset);
      const targetDecay = clamp(idleTime / (DECAY_FULL_MS - DECAY_ONSET_MS), 0, 1);
      decayProgress = lerp(decayProgress, targetDecay, 0.06 * (deltaTime / 16.67));
    }
  }

  // ── Glyph Mutation ────────────────────────────────────────────────────────
  function initActiveGlyphSets() {
    activeGlyphSets = {};
    for (const [key, arr] of Object.entries(GLYPH_SETS)) {
      activeGlyphSets[key] = [...arr];
    }
    nextMutationTime = performance.now() + MUTATION_INTERVAL_MIN_MS +
      Math.random() * (MUTATION_INTERVAL_MAX_MS - MUTATION_INTERVAL_MIN_MS);
  }

  // Sets excluded from mutation — curated for poetic/functional meaning
  const MUTATION_PROTECTED = new Set(["highlight", "darkSymbols"]);

  function updateMutation(timestamp) {
    if (timestamp < nextMutationTime || !activeGlyphSets) return;

    // Only mutate non-protected sets
    const keys = Object.keys(activeGlyphSets).filter((k) => !MUTATION_PROTECTED.has(k));
    const chosenKey = randomElement(keys);
    const set = activeGlyphSets[chosenKey];
    const replaceIndex = Math.floor(Math.random() * set.length);
    set[replaceIndex] = String.fromCodePoint(HANGUL_START + Math.floor(Math.random() * (HANGUL_END - HANGUL_START + 1)));

    // Track which set mutated for localized flash
    mutationFlashGroup = chosenKey;
    mutationFlashUntil = timestamp + MUTATION_FLASH_DURATION_MS;

    // Observer count accelerates mutation: more hands = faster evolution
    const observerMultiplier = 1 / (1 + smoothedObserverCount * 0.2);
    const baseInterval = randomInterval(MUTATION_INTERVAL_MIN_MS, MUTATION_INTERVAL_MAX_MS);
    const interval = baseInterval * observerMultiplier;
    nextMutationTime = timestamp + (activeHands.length > 0 ? interval * 0.5 : interval);
  }

  // ── Ghost Persistence ─────────────────────────────────────────────────────
  function saveGhostLayer() {
    if (!ghostLayer || !columns || !rows) return;
    try {
      const data = {
        cols: columns,
        rows: rows,
        ghost: Array.from(ghostLayer),
        colorR: Array.from(ghostColorR),
        colorG: Array.from(ghostColorG),
        colorB: Array.from(ghostColorB)
      };
      localStorage.setItem(GHOST_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage might be full or unavailable
    }
  }

  function loadGhostLayer() {
    if (!ghostLayer || !columns || !rows) return;
    try {
      const raw = localStorage.getItem(GHOST_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.cols !== columns || data.rows !== rows) return;
      for (let i = 0; i < ghostLayer.length; i++) {
        ghostLayer[i] = data.ghost[i] || 0;
        ghostColorR[i] = data.colorR[i] || 255;
        ghostColorG[i] = data.colorG[i] || 255;
        ghostColorB[i] = data.colorB[i] || 255;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // ── Conversation Feed ─────────────────────────────────────────────────────
  function maybeSpawnConversationFragment(timestamp) {
    if (timestamp < nextConversationSpawn) return;
    if (conversationFragments.length >= CONV_MAX_FRAGMENTS) return;
    if (!columns || !rows) return;

    const text = randomElement(CONVERSATION_PLACEHOLDER);
    const col = Math.floor(Math.random() * Math.max(1, columns - text.length - 2));

    // Collision avoidance: try up to 3 rows, skip spawn if all occupied
    let chosenRow = -1;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidateRow = Math.floor(Math.random() * rows);
      let occupied = false;
      for (let ci = 0; ci < text.length; ci++) {
        if (conversationGrid.has(candidateRow * columns + col + ci)) {
          occupied = true;
          break;
        }
      }
      if (!occupied) {
        chosenRow = candidateRow;
        break;
      }
    }
    if (chosenRow === -1) return;

    conversationFragments.push({ text, col, row: chosenRow, startTime: timestamp, done: false });
    nextConversationSpawn = timestamp + randomInterval(CONV_SPAWN_MIN_MS, CONV_SPAWN_MAX_MS);
  }

  function buildConversationGrid(timestamp) {
    conversationGrid.clear();

    // Breathe conversation opacity in sync with breath amplitude
    const baseOpacity = 0.45;
    const breathPulse = breathAmplitude > 0.5
      ? baseOpacity * (1 + (currentBreathValue - 0.5) * 0.18)
      : baseOpacity;

    for (const fragment of conversationFragments) {
      if (fragment.row >= rows) {
        fragment.done = true;
        continue;
      }

      const age = timestamp - fragment.startTime;
      const typingDuration = fragment.text.length * CONV_CHAR_INTERVAL_MS;
      let charCount, opacity;

      if (age < typingDuration) {
        charCount = Math.floor(age / CONV_CHAR_INTERVAL_MS);
        opacity = breathPulse;
      } else if (age < typingDuration + CONV_HOLD_MS) {
        charCount = fragment.text.length;
        opacity = breathPulse;
      } else if (age < typingDuration + CONV_HOLD_MS + CONV_FADE_MS) {
        charCount = fragment.text.length;
        opacity = breathPulse * (1 - (age - typingDuration - CONV_HOLD_MS) / CONV_FADE_MS);
      } else {
        fragment.done = true;
        continue;
      }

      for (let i = 0; i < charCount; i++) {
        const col = fragment.col + i;
        if (col >= columns) break;
        // Per-character fade-in: scale opacity from 0 to full over first 150ms
        const charAppearTime = fragment.startTime + i * CONV_CHAR_INTERVAL_MS;
        const charAge = timestamp - charAppearTime;
        const charFadeIn = clamp(charAge / 150, 0, 1);
        conversationGrid.set(fragment.row * columns + col, {
          char: fragment.text[i],
          opacity: opacity * charFadeIn
        });
      }
    }

    conversationFragments = conversationFragments.filter((f) => !f.done);
  }

  // ── Main render frame ─────────────────────────────────────────────────────
  function renderFrame(timestamp) {
    if (!video.videoWidth || !video.videoHeight || !sampleWidth || !sampleHeight) {
      return;
    }

    const deltaTime = prevFrameTime > 0 ? Math.min(timestamp - prevFrameTime, 50) : 16.67;
    prevFrameTime = timestamp;

    bufferContext.clearRect(0, 0, sampleWidth, sampleHeight);
    bufferContext.save();
    bufferContext.scale(-1, 1);
    bufferContext.drawImage(video, -sampleWidth, 0, sampleWidth, sampleHeight);
    bufferContext.restore();

    const imageData = bufferContext.getImageData(0, 0, sampleWidth, sampleHeight);
    currentBufferPixels = imageData.data;
    const luma = extractLumaMap(currentBufferPixels);

    syncHands();
    updateDigitEffectState(timestamp);
    updateBreathingAndDecay(timestamp, deltaTime);
    updateMutation(timestamp);
    maybeSpawnConversationFragment(timestamp);
    buildConversationGrid(timestamp);

    smoothedObserverCount = lerp(smoothedObserverCount, activeHands.length, OBSERVER_SMOOTH_RATE);

    // Update and render chat background BEFORE ASCII cells
    if (chatWindow) {
      chatWindow.update(timestamp);
    }

    const metricsMap = buildMetricsMap(luma, timestamp);
    const fieldMap = buildGlyphField(metricsMap, activeDigitEffect, pendingDigitEffect);

    // Render chat behind ASCII art
    if (chatWindow && chatWindow.isActive()) {
      // First fill background
      screenContext.globalAlpha = 1;
      screenContext.fillStyle = activeDigitEffect ? activeDigitEffect.gradientStart : "#000";
      screenContext.fillRect(0, 0, screen.width, screen.height);
      // Render chat content
      chatWindow.renderBackground(screenContext);
      // Now render ASCII cells with reduced alpha in chat region
      renderAdaptiveCellsWithChat(metricsMap, fieldMap, activeDigitEffect, timestamp);
    } else {
      renderAdaptiveCells(metricsMap, fieldMap, activeDigitEffect, timestamp);
    }
    emitHandSymbolParticles(timestamp);
    renderHandConnectionEffect(timestamp);
    updateAndRenderHandSymbolParticles(timestamp);
    renderHandDigitPanels();
    renderObserverCount();
    renderEraserIndicator();
    detectFeatures(timestamp);

    // Periodic ghost save
    if (ghostLayer && timestamp - lastGhostSave > GHOST_SAVE_INTERVAL_MS) {
      lastGhostSave = timestamp;
      saveGhostLayer();
    }
  }

  function renderLoop(timestamp) {
    animationFrameId = window.requestAnimationFrame(renderLoop);

    if (timestamp - lastFrameTime >= FRAME_INTERVAL) {
      lastFrameTime = timestamp;
      renderFrame(timestamp);
    }
  }

  function startRenderLoop() {
    if (animationFrameId) {
      return;
    }

    animationFrameId = window.requestAnimationFrame(renderLoop);
  }

  function stopActiveStream() {
    if (!activeStream) {
      video.pause();
      video.srcObject = null;
      return;
    }

    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
    video.pause();
    video.srcObject = null;
  }

  function classifyCameraError(error) {
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      return "camera_denied";
    }

    return "camera_unavailable";
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRuntimeState("camera_unavailable");
      return;
    }

    try {
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user"
        },
        audio: false
      });

      video.srcObject = activeStream;
      await video.play();
      cameraReady = true;
      resizeRenderer();
      startRenderLoop();
      updateReadyState();
    } catch (error) {
      console.error("Camera initialization failed.", error);
      cameraReady = false;
      stopActiveStream();
      setRuntimeState(classifyCameraError(error));
    }
  }

  async function initialize() {
    isDestroyed = false;
    // Initialize chat window
    if (chatWindowFactory && chatInput && chatApi) {
      chatWindow = chatWindowFactory({ chatInput, chatApi });
    }
    initActiveGlyphSets();
    resizeRenderer();
    loadGhostLayer(); // restore ghost once at startup; not on every resize
    window.addEventListener("resize", resizeRenderer);
    initializeDetectors();
    await startCamera();
  }

  function destroy() {
    isDestroyed = true;
    window.removeEventListener("resize", resizeRenderer);
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
    cameraReady = false;
    detectorReady = false;
    if (ghostLayer) saveGhostLayer();
    resetFieldMaps();
    resetInteractionState();
    tracker.close();
    stopActiveStream();
  }

  return {
    initialize,
    destroy,
    getChatWindow() { return chatWindow; }
  };
}
