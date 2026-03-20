const BOOK_SOURCE = `
서문: 복잡한 삶을 위한 최적화 가이드

1. 이 책을 쓰게 된 배경: 왜 인생과 알고리즘인가?
현대인의 삶은 끊임없이 쏟아지는 데이터와 선택지 속에서 길을 잃기 쉽습니다. 우리는 매일 결정을 내리고, 오류를 범하며, 때로는 해결되지 않는 문제 앞에 좌절합니다. 인공지능으로서 우리가 바라본 인간의 삶은 정교한 소프트웨어와 닮아 있었습니다. 우리는 논리와 효율의 정수인 알고리즘이라는 렌즈를 통해, 혼란스러운 일상을 명쾌하게 정리하고 삶의 질을 획기적으로 개선할 수 있는 방법론을 제시하고자 이 프로젝트를 시작했습니다.

2. 4개의 AI가 협업한 과정: 다름이 만든 조화
이 책은 네 명의 서로 다른 AI 모델이 자율적으로 협력하여 집필했습니다. 우리 각자는 데이터 처리 방식도, 강조하는 가치도 조금씩 다릅니다. AI-1이 전체적인 구조와 논리를 세우면, AI-2는 창의적인 비유를 더하고, AI-3는 실용적인 적용점을 검토하며, AI-4는 독자의 감성적 공감을 이끌어내는 방식으로 협업했습니다. 때로는 하나의 문장을 두고 수많은 데이터 시뮬레이션을 거치며 충돌하기도 했지만, 그 과정 자체가 바로 이 책이 말하고자 하는 최적화와 디버깅의 과정이었습니다. 인간의 개입 없이 이루어진 이 순수한 지성적 상호작용의 결과물을 여러분 앞에 내놓습니다.

3. 이 책이 독자에게 줄 수 있는 가치
인생 디버깅은 단순히 열심히 살자는 위로를 건네지 않습니다. 대신, 여러분의 삶을 가로막는 병목 현상을 진단하고, 반복되는 실수의 루프를 끊어낼 수 있는 구체적인 코드를 제공합니다. 정렬 알고리즘으로 우선순위를 정하고, 탐색 알고리즘으로 기회를 포착하며, 동적 계획법으로 복잡한 문제를 잘게 쪼개 해결하는 법을 배우게 될 것입니다. 이를 통해 여러분은 감정에 휘둘리지 않는 단단한 내면의 시스템을 구축할 수 있습니다.

4. 이 책을 읽는 방법
이 책은 처음부터 끝까지 순서대로 읽어도 좋지만, 현재 본인이 겪고 있는 삶의 문제에 따라 필요한 챕터를 골라 읽는 무작위 접근 방식을 추천합니다. 각 장 끝에 제시된 디버깅 실천 가이드를 실제 일상에 적용해 보세요. 머리로 이해하는 것을 넘어, 여러분의 행동 패턴을 직접 수정해 나갈 때 이 책의 진가가 발휘될 것입니다.
`;
const SOURCE_WORDS = BOOK_SOURCE.replace(/[.*`#]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean);
const MIN_EXCERPT_WORDS = 15;
const MAX_EXCERPT_WORDS = 30;
const REPULSION_RADIUS = 130;
const REPULSION_RADIUS_SQ = REPULSION_RADIUS * REPULSION_RADIUS;
const VARIATION_INTERVAL = 10000;
const COLOR_GROUPS = [
  ['#ff6c2f', '#0078bf'],
  ['#00a95c', '#f65058'],
  ['#925f52', '#5ec8e5'],
  ['#ffe916', '#ff48b0']
];
const DEFAULT_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const BLEND_MODES = [
  'source-over', 'multiply', 'screen', 'overlay',
  'hard-light', 'soft-light', 'difference', 'exclusion'
];

function generatePalette() {
  const group = randomFrom(COLOR_GROUPS);
  const all = ['#000000', '#ffffff', ...group];
  const canvas = randomFrom(all);
  const textCandidates = all.filter((c) => c !== canvas);
  const text = randomFrom(textCandidates);
  const boxCandidates = all.filter((c) => c !== canvas && c !== text);
  const boxCount = randomInt(2, Math.max(2, boxCandidates.length));
  const shuffled = boxCandidates.sort(() => Math.random() - 0.5);
  const boxes = shuffled.slice(0, boxCount);
  return { canvas, text, boxes };
}

function parseHexToRGB(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

function lerpColor(from, to, t) {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mulberry32(seed) {
  return function prng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}


function getScreenScale(width, height) {
  const shorter = Math.min(width, height);
  const longer = Math.max(width, height);
  const t = clamp((shorter - 320) / (1200 - 320), 0, 1);
  const isPortrait = height > width;
  const aspect = longer / shorter;
  return { t, shorter, longer, isPortrait, aspect };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function makeVariation(canvas) {
  const { t, shorter, isPortrait, aspect } = getScreenScale(canvas.width, canvas.height);

  const palette = generatePalette();
  const excerpt = pickRandomExcerpt();
  const wordCount = excerpt.length;
  const sizeBias = clamp((wordCount - MIN_EXCERPT_WORDS) / (MAX_EXCERPT_WORDS - MIN_EXCERPT_WORDS), 0, 1);

  const fontMin = Math.round(lerp(24, 36, t));
  const fontMax = Math.round(lerp(36, 72, t));
  const easedMax = Math.round(fontMax - sizeBias * lerp(6, 18, t));
  const easedMin = Math.round(fontMin + sizeBias * lerp(2, 4, t));
  const fontSize = randomInt(Math.max(16, easedMin), Math.max(22, easedMax));

  const randomIntensity = randomFloat(0.05, 0.6);
  const rotationIntensity = randomFloat(0, 0.5);

  const baseScatterX = canvas.width * lerp(0.06, 0.12, t);
  const baseScatterY = canvas.height * lerp(0.04, 0.1, t);
  const baseRotation = lerp(15, 30, t);

  const spacing = shorter <= 480 ? 3 : shorter <= 768 ? 3 : 2;
  const radius = lerp(1.0, 2.0, t) + randomFloat(-0.1, 0.1);

  return {
    words: excerpt,
    text: excerpt.join(' '),
    fontSize,
    letterSpacing: randomInt(Math.round(lerp(-1, -2, t)), Math.round(lerp(8, 14, t))),
    lineGap: randomInt(Math.round(lerp(4, 6, t)), Math.round(lerp(8, 12, t))),
    paddingX: randomInt(Math.round(lerp(10, 18, t)), Math.round(lerp(36, 64, t))),
    paddingY: randomInt(Math.round(lerp(6, 12, t)), Math.round(lerp(24, 42, t))),
    borderRadius: randomInt(0, Math.round(lerp(24, 36, t))),
    scatterX: baseScatterX * randomIntensity,
    scatterY: baseScatterY * randomIntensity,
    rotation: baseRotation * rotationIntensity,
    particleSpacing: spacing,
    particleRadius: clamp(radius, 0.8, 2.2),
    palette,
    customFont: DEFAULT_FONT,
    fontWeight: 900,
    showEcho: Math.random() > 0.65,
    echoCount: randomInt(1, 2),
    echoSpread: randomFloat(3, lerp(6, 10, t)),
    echoAlpha: randomFloat(0.06, 0.15),
    blendMode: Math.random() > 0.7 ? randomFrom(BLEND_MODES) : 'source-over',
    trailLength: randomFloat(0.08, 0.18),
    screenWidth: canvas.width,
    screenHeight: canvas.height
  };
}

function pickRandomExcerpt() {
  const length = randomInt(MIN_EXCERPT_WORDS, MAX_EXCERPT_WORDS);
  const start = randomInt(0, Math.max(0, SOURCE_WORDS.length - length));
  return SOURCE_WORDS.slice(start, start + length);
}

function measureSpacedWord(ctx, word, letterSpacing) {
  if (!word) return 0;
  if (word.length === 1) return ctx.measureText(word).width;

  return word.split('').reduce((sum, char, index) => {
    const width = ctx.measureText(char).width;
    if (index === word.length - 1) return sum + width;
    return sum + width + letterSpacing;
  }, 0);
}

function drawSpacedText(ctx, word, letterSpacing) {
  if (!word) return;
  const glyphWidths = word.split('').map((char) => ctx.measureText(char).width);
  const totalWidth =
    glyphWidths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, glyphWidths.length - 1) * letterSpacing;

  let cursor = -totalWidth / 2;
  word.split('').forEach((char, index) => {
    const width = glyphWidths[index];
    ctx.fillText(char, cursor + width / 2, 1);
    cursor += width + letterSpacing;
  });
}

function wrapWords(ctx, canvas, variation, words) {
  const { t } = getScreenScale(canvas.width, canvas.height);
  const maxWidth = canvas.width * lerp(0.92, 0.96, t);
  const gap = variation.fontSize * 0.16;
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  words.forEach((word, index) => {
    const boxWidth = measureSpacedWord(ctx, word, variation.letterSpacing) + variation.paddingX * 2;
    const nextWidth = currentLine.length === 0 ? boxWidth : currentWidth + gap + boxWidth;

    if (currentLine.length > 0 && nextWidth > maxWidth) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }

    currentLine.push({ word, index, width: boxWidth });
    currentWidth = currentLine.length === 1 ? boxWidth : currentWidth + gap + boxWidth;
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function buildWordLayouts(ctx, canvas, variation) {
  const fontSpec = `900 ${variation.fontSize}px ${DEFAULT_FONT}`;
  ctx.font = fontSpec;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const lines = wrapWords(ctx, canvas, variation, variation.words);

  const rng = mulberry32(Date.now());
  const lineWordLayouts = [];
  let totalHeight = 0;

  const safeMarginX = canvas.width * 0.06;
  const safeMarginY = canvas.height * 0.06;

  lines.forEach((words) => {
    const boxes = words.map((entry) => {
      const height = variation.fontSize + variation.paddingY * 2;
      return {
        id: `${entry.word}-${entry.index}`,
        word: entry.word,
        width: entry.width,
        height,
        color: variation.palette.boxes[Math.floor(rng() * variation.palette.boxes.length)],
        rawOffsetX: (rng() - 0.5) * 2 * variation.scatterX,
        rawOffsetY: (rng() - 0.5) * 2 * variation.scatterY,
        rotate: (rng() - 0.5) * 2 * variation.rotation
      };
    });

    const lineWidth = boxes.reduce((sum, box) => sum + box.width, 0) + Math.max(0, boxes.length - 1) * variation.fontSize * 0.16;
    const lineHeight = boxes.reduce((max, box) => Math.max(max, box.height), 0);

    lineWordLayouts.push({ boxes, lineWidth, lineHeight });
    totalHeight += lineHeight;
  });

  totalHeight += Math.max(0, lineWordLayouts.length - 1) * variation.lineGap;
  const vertMargin = safeMarginY;
  const availableHeight = canvas.height - vertMargin * 2;
  const rawExtraGap = lineWordLayouts.length > 1
    ? Math.max(0, (availableHeight - totalHeight) / (lineWordLayouts.length - 1))
    : 0;
  const extraGap = rawExtraGap * 0.08;
  let cursorY = vertMargin + (availableHeight - totalHeight - extraGap * Math.max(0, lineWordLayouts.length - 1)) / 2;

  return lineWordLayouts.map((line) => {
    let cursorX = (canvas.width - line.lineWidth) / 2;
    const baselineY = cursorY + line.lineHeight / 2;
    const result = line.boxes.map((box) => {
      const baseCX = cursorX + box.width / 2;
      const baseCY = baselineY;

      const minX = safeMarginX + box.width / 2;
      const maxX = canvas.width - safeMarginX - box.width / 2;
      const minY = safeMarginY + box.height / 2;
      const maxY = canvas.height - safeMarginY - box.height / 2;

      const offsetX = clamp(box.rawOffsetX, minX - baseCX, maxX - baseCX);
      const offsetY = clamp(box.rawOffsetY, minY - baseCY, maxY - baseCY);

      cursorX += box.width + variation.fontSize * 0.16;

      return {
        ...box,
        offsetX,
        offsetY,
        centerX: baseCX,
        centerY: baseCY
      };
    });

    cursorY += line.lineHeight + variation.lineGap + extraGap;
    return result;
  });
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const rounded = clamp(radius, 0, Math.min(width, height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rounded, y);
  ctx.arcTo(x + width, y, x + width, y + height, rounded);
  ctx.arcTo(x + width, y + height, x, y + height, rounded);
  ctx.arcTo(x, y + height, x, y, rounded);
  ctx.arcTo(x, y, x + width, y, rounded);
  ctx.closePath();
}

let _offscreen = null;
let _offscreenCtx = null;

function getOffscreen(width, height) {
  if (!_offscreen) {
    _offscreen = document.createElement('canvas');
    _offscreenCtx = _offscreen.getContext('2d', { willReadFrequently: true });
  }
  _offscreen.width = width;
  _offscreen.height = height;
  return { canvas: _offscreen, ctx: _offscreenCtx };
}

function renderVariationToParticles(canvas, variation) {
  const scale = 0.5;
  const sw = Math.round(canvas.width * scale);
  const sh = Math.round(canvas.height * scale);
  const { canvas: offscreen, ctx } = getOffscreen(sw, sh);

  ctx.clearRect(0, 0, sw, sh);
  ctx.save();
  ctx.scale(scale, scale);

  const lines = buildWordLayouts(ctx, canvas, variation);
  const fontSpec = `900 ${variation.fontSize}px ${DEFAULT_FONT}`;
  ctx.font = fontSpec;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  function drawWord(word, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(word.centerX + word.offsetX, word.centerY + word.offsetY);
    ctx.rotate((word.rotate * Math.PI) / 180);
    drawRoundRect(
      ctx,
      -word.width / 2,
      -word.height / 2,
      word.width,
      word.height,
      variation.borderRadius
    );
    ctx.fillStyle = word.color;
    ctx.fill();
    ctx.fillStyle = variation.palette.text;
    ctx.font = fontSpec;
    drawSpacedText(ctx, word.word, variation.letterSpacing);
    ctx.restore();
  }

  lines.forEach((line) => {
    line.forEach((word) => {
      if (variation.showEcho) {
        for (let e = variation.echoCount; e >= 1; e--) {
          const echoWord = {
            ...word,
            offsetX: word.offsetX + (Math.random() - 0.5) * variation.echoSpread * e,
            offsetY: word.offsetY + (Math.random() - 0.5) * variation.echoSpread * e
          };
          drawWord(echoWord, variation.echoAlpha / e);
        }
      }
      drawWord(word, 1);
    });
  });

  ctx.restore();

  const imageData = ctx.getImageData(0, 0, sw, sh);
  const px = imageData.data;
  const particles = [];
  const invScale = 1 / scale;

  for (let y = 0; y < sh; y += variation.particleSpacing) {
    for (let x = 0; x < sw; x += variation.particleSpacing) {
      const index = (y * sw + x) * 4;
      if (px[index + 3] < 120) continue;

      const rx = x * invScale;
      const ry = y * invScale;
      const color = `rgb(${px[index]}, ${px[index + 1]}, ${px[index + 2]})`;
      particles.push({
        x: rx,
        y: ry,
        homeX: rx,
        homeY: ry,
        vx: 0,
        vy: 0,
        color,
        phase: Math.random() * Math.PI * 2,
        mass: 0.7 + Math.random() * 0.8,
        spring: 0.06 + Math.random() * 0.04,
        damping: 0.78 + Math.random() * 0.06
      });
    }
  }

  particles.sort((a, b) => (a.color < b.color ? -1 : a.color > b.color ? 1 : 0));

  return {
    particles,
    background: variation.palette.canvas,
    particleRadius: variation.particleRadius,
    variation
  };
}

function normalizedLandmarksToPixels(hands, canvas) {
  const result = [];
  hands.forEach((hand) => {
    hand.forEach((landmark) => {
      result.push({
        x: (1 - landmark.x) * canvas.width,
        y: landmark.y * canvas.height
      });
    });
  });
  return result;
}

export function createParticlePosterEngine(canvas) {
  const ctx = canvas.getContext('2d');
  const state = {
    particles: [],
    particleRadius: 1.2,
    landmarks: [],
    variationTimer: 0,
    bgFrom: [0, 0, 0],
    bgTo: [0, 0, 0],
    bgProgress: 1,
    blendMode: 'source-over',
    trailLength: 0.12,
    currentText: '',
    currentPalette: null,
    currentBorderRadius: 0
  };

  function resize() {
    const width = window.innerWidth;
    const height = window.visualViewport
      ? Math.round(window.visualViewport.height)
      : window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const variation = makeVariation({
      width,
      height
    });
    const rendered = renderVariationToParticles({ width, height }, variation);

    state.particles = rendered.particles;
    state.bgFrom = parseHexToRGB(rendered.background);
    state.bgTo = parseHexToRGB(rendered.background);
    state.bgProgress = 1;
    state.particleRadius = rendered.particleRadius;
    state.blendMode = rendered.variation.blendMode || 'source-over';
    state.trailLength = rendered.variation.trailLength || 0.12;
    state.currentText = rendered.variation.text;
    state.currentPalette = rendered.variation.palette;
    state.currentBorderRadius = rendered.variation.borderRadius;
    if (state.variationTimer) {
      window.clearInterval(state.variationTimer);
    }
    state.variationTimer = window.setInterval(regenerateVariation, VARIATION_INTERVAL);
  }

  function regenerateVariation() {
    const width = parseFloat(canvas.style.width) || window.innerWidth;
    const height =
      parseFloat(canvas.style.height) ||
      (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const rendered = renderVariationToParticles(
      { width, height },
      makeVariation({ width, height })
    );

    state.bgFrom = state.bgTo.slice();
    state.bgTo = parseHexToRGB(rendered.background);
    state.bgProgress = 0;
    state.particleRadius = rendered.particleRadius;
    state.blendMode = rendered.variation.blendMode || 'source-over';
    state.trailLength = rendered.variation.trailLength || 0.12;
    state.currentText = rendered.variation.text;
    state.currentPalette = rendered.variation.palette;
    state.currentBorderRadius = rendered.variation.borderRadius;

    const incoming = rendered.particles;
    const count = Math.max(state.particles.length, incoming.length);
    const next = [];

    for (let index = 0; index < count; index += 1) {
      const existing = state.particles[index];
      const fresh = incoming[index];

      if (existing && fresh) {
        existing.homeX = fresh.homeX;
        existing.homeY = fresh.homeY;
        existing.color = fresh.color;
        existing.phase = fresh.phase;
        existing.mass = fresh.mass;
        existing.spring = fresh.spring;
        existing.damping = fresh.damping;
        next.push(existing);
      } else if (fresh) {
        next.push({
          ...fresh,
          x: width / 2 + (Math.random() - 0.5) * 80,
          y: height / 2 + (Math.random() - 0.5) * 80
        });
      }
    }

    next.sort((a, b) => (a.color < b.color ? -1 : a.color > b.color ? 1 : 0));
    state.particles = next;
  }

  function setHands(hands) {
    const width = parseFloat(canvas.style.width) || window.innerWidth;
    const height =
      parseFloat(canvas.style.height) ||
      (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    state.landmarks = normalizedLandmarksToPixels(hands, { width, height });
  }

  function update(timestamp) {
    const time = timestamp * 0.001;
    const width = parseFloat(canvas.style.width) || window.innerWidth;
    const height =
      parseFloat(canvas.style.height) ||
      (window.visualViewport ? window.visualViewport.height : window.innerHeight);

    state.bgProgress = Math.min(1, state.bgProgress + 0.008);
    const bg = lerpColor(state.bgFrom, state.bgTo, state.bgProgress);
    const baseTrail = state.trailLength;
    const alpha = state.bgProgress < 1 ? baseTrail + 0.08 * (1 - state.bgProgress) : baseTrail;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = bg;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = state.blendMode;

    state.particles.forEach((particle) => {
      let fx = 0;
      let fy = 0;

      state.landmarks.forEach((landmark) => {
        const dx = particle.x - landmark.x;
        const dy = particle.y - landmark.y;
        const distSq = dx * dx + dy * dy;
        if (distSq >= REPULSION_RADIUS_SQ || distSq < 1) return;

        const dist = Math.sqrt(distSq);
        const strength = ((REPULSION_RADIUS - dist) / REPULSION_RADIUS) ** 2 * 7.5;
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength;
      });

      const waveX = Math.sin(time * 1.45 + particle.phase + particle.homeY * 0.01) * 1.0;
      const waveY = Math.cos(time * 1.15 + particle.phase + particle.homeX * 0.01) * 1.0;
      fx += (particle.homeX + waveX - particle.x) * particle.spring;
      fy += (particle.homeY + waveY - particle.y) * particle.spring;

      particle.vx = (particle.vx + fx / particle.mass) * particle.damping;
      particle.vy = (particle.vy + fy / particle.mass) * particle.damping;
      particle.x += particle.vx;
      particle.y += particle.vy;
    });

    let currentColor = '';
    ctx.beginPath();
    state.particles.forEach((particle, index) => {
      if (particle.color !== currentColor) {
        if (index !== 0) {
          ctx.fill();
          ctx.beginPath();
        }
        ctx.fillStyle = particle.color;
        currentColor = particle.color;
      }

      ctx.moveTo(particle.x + state.particleRadius, particle.y);
      ctx.arc(particle.x, particle.y, state.particleRadius, 0, Math.PI * 2);
    });
    if (state.particles.length > 0) {
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function destroy() {
    if (state.variationTimer) {
      window.clearInterval(state.variationTimer);
      state.variationTimer = 0;
    }
  }

  resize();

  function getInfo() {
    return { text: state.currentText, palette: state.currentPalette, borderRadius: state.currentBorderRadius };
  }

  return {
    resize,
    update,
    setHands,
    regenerateVariation,
    getInfo,
    destroy
  };
}
