// ASCII Art Compositor — full 전시7 style glyph rendering
// Person area: same ASCII art but with original video colors
// Background area: monochrome ASCII art

const FONT_FAMILY = '"D2Coding", "Nanum Gothic Coding", "Noto Sans Mono CJK KR", monospace';

const GLYPH_SETS = {
  background: [' ', '.', '`', ',', '·', ':', ';', "'", '"', '/', '\\', '-', '_', '|', '=', '~', '요', '오', '우'],
  fillLight: ['가', '나', '라', '보', '소', '오', '우', '.', ':', '/', '+', '-', '_', '|', '=', '~'],
  fillMid: ['다', '러', '서', '어', '은', '지', '조', '루', '미', '부', '누', '리', '*', '#'],
  fillDense: ['한', '명', '울', '향', '홍', '활', '층', '품', '흔', '률', '림', '결'],
  highlight: ['빛', '별', '달', '눈', '봄', '숨', '온', '윤', '결', '람', '꽃', '밤'],
  edgeHorizontal: ['으', '모', '로', '보', '문', '프', '호', '무', '후', '효', '=', '-', '_', '+'],
  edgeVertical: ['이', '시', '기', '비', '니', '미', '히', '직', '린', '휘', '|', '!', ':'],
  edgeDiagonal: ['사', '차', '카', '자', '재', '채', '새', '파', '하', '저', '/', '\\', 'x'],
  edgeSymbols: ['/', '\\', '-', '_', '|', '=', ':', '.', '`', '+', '#', '*', '!', 'x'],
  darkSymbols: ['/', '\\', '-', '_', '|', '=', ':', '.', '`', "'", '~']
};

const SAMPLE_R = 2;
const TONE_SMOOTHING = 0.24;
const CONTRAST_BOOST = 1.48;
const BLACK_POINT = 0.08;
const WHITE_POINT = 0.92;
const GAMMA = 0.92;
const LOW_EDGE = 0.12;
const HIGH_EDGE = 0.24;
const EDGE_RATIO = 1.18;
const BRIGHT_TILE_THRESHOLD = 0.78;
const BASE_ALPHA_STEPS = [0.08, 0.16, 0.28, 0.42, 0.58, 0.76, 0.92];
const GLYPH_ALPHA_STEPS = [0.16, 0.26, 0.38, 0.52, 0.68, 0.84, 0.96];
const BG_COLOR = '#000000';
const GLYPH_COLOR = '#ffffff';

export function createMosaicCompositor(outputCanvas) {
  const outCtx = outputCanvas.getContext('2d');

  const sampleBuf = document.createElement('canvas');
  const sampleCtx = sampleBuf.getContext('2d', { willReadFrequently: true });

  const colorBuf = document.createElement('canvas');
  const colorCtx = colorBuf.getContext('2d', { willReadFrequently: true });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let sampleW = 0;
  let sampleH = 0;
  let cellW = 0;
  let cellH = 0;
  let fontSize = 0;
  let glyphFont = '';
  let prevTones = null;
  let prevGlyphs = null;
  let prevGroups = null;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function pseudoRandom(seed, salt) {
    const v = Math.sin(seed * 12.9898 + (salt || 0) * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
    return h;
  }

  function quantize(value, steps) {
    const i = Math.min(steps.length - 1, Math.floor(clamp(value, 0, 0.9999) * steps.length));
    return steps[i];
  }

  function resize() {
    width = window.innerWidth;
    height = window.visualViewport
      ? Math.round(window.visualViewport.height)
      : window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    outputCanvas.width = Math.round(width * dpr);
    outputCanvas.height = Math.round(height * dpr);
    outputCanvas.style.width = `${width}px`;
    outputCanvas.style.height = `${height}px`;

    const shorter = Math.min(width, height);
    fontSize = clamp(Math.round(shorter / 55), 8, 16);
    cellW = fontSize * 1.02;
    cellH = fontSize * 0.95;

    cols = Math.max(30, Math.floor(width / cellW));
    rows = Math.max(20, Math.floor(height / cellH));
    sampleW = cols * 2;
    sampleH = rows * 3;

    sampleBuf.width = sampleW;
    sampleBuf.height = sampleH;
    sampleCtx.imageSmoothingEnabled = true;
    sampleCtx.imageSmoothingQuality = 'high';

    colorBuf.width = cols;
    colorBuf.height = rows;

    prevTones = new Float32Array(cols * rows);
    prevGlyphs = new Array(cols * rows).fill('');
    prevGroups = new Array(cols * rows).fill('');
    glyphFont = `${Math.max(5, Math.min(14, fontSize * 1.08))}px ${FONT_FAMILY}`;
  }

  // --- Luma extraction ---
  function extractLuma(pixels) {
    const luma = new Float32Array(sampleW * sampleH);
    let minL = 255, maxL = 0;
    for (let i = 0, pi = 0; i < luma.length; i++, pi += 4) {
      const l = 0.299 * pixels[pi] + 0.587 * pixels[pi + 1] + 0.114 * pixels[pi + 2];
      luma[i] = l;
      if (l < minL) minL = l;
      if (l > maxL) maxL = l;
    }
    const range = Math.max(maxL - minL, 1);
    for (let i = 0; i < luma.length; i++) {
      let n = (luma[i] - minL) / range;
      n = clamp((n - BLACK_POINT) / Math.max(WHITE_POINT - BLACK_POINT, 0.001), 0, 1);
      n = Math.pow(n, GAMMA);
      n = clamp((n - 0.5) * CONTRAST_BOOST + 0.5, 0, 1);
      luma[i] = n * 255;
    }
    return luma;
  }

  function readLuma(luma, x, y) {
    return luma[clamp(Math.round(y), 0, sampleH - 1) * sampleW + clamp(Math.round(x), 0, sampleW - 1)];
  }

  // --- Per-cell metrics ---
  function sampleMetrics(luma, normX, normY) {
    const cx = normX * (sampleW - 1);
    const cy = normY * (sampleH - 1);
    const rx = Math.max(1, SAMPLE_R * 2);
    const ry = Math.max(1, SAMPLE_R * 3);

    const center = readLuma(luma, cx, cy);
    const left = readLuma(luma, cx - rx, cy);
    const right = readLuma(luma, cx + rx, cy);
    const top = readLuma(luma, cx, cy - ry);
    const bottom = readLuma(luma, cx, cy + ry);

    const samples = [center, left, right, top, bottom];
    let total = 0, min = 255, max = 0;
    for (const v of samples) {
      total += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    const gx = right - left;
    const gy = bottom - top;

    return {
      tone: total / samples.length / 255,
      contrast: (max - min) / 255,
      edge: (Math.abs(gx) + Math.abs(gy)) / 255,
      gx,
      gy
    };
  }

  // --- Glyph group selection (전시7 algorithm) ---
  function getToneBucket(tone) {
    if (tone < 0.16) return 'background';
    if (tone < 0.42) return 'fillLight';
    if (tone < 0.7) return 'fillMid';
    if (tone < 0.86) return 'fillDense';
    return 'highlight';
  }

  function getOrientation(m) {
    if (m.edge < LOW_EDGE) return 'flat';
    if (Math.abs(m.gx) > Math.abs(m.gy) * EDGE_RATIO) return 'horizontal';
    if (Math.abs(m.gy) > Math.abs(m.gx) * EDGE_RATIO) return 'vertical';
    return 'diagonal';
  }

  function orientationGroup(o) {
    if (o === 'horizontal') return 'edgeHorizontal';
    if (o === 'vertical') return 'edgeVertical';
    if (o === 'diagonal') return 'edgeDiagonal';
    return 'fillMid';
  }

  function resolveGroup(m, tone) {
    const o = getOrientation(m);
    if (m.edge > HIGH_EDGE) return orientationGroup(o);
    return getToneBucket(tone);
  }

  function selectGlyph(index, tone, metrics) {
    const groupName = resolveGroup(metrics, tone);
    const glyphs = GLYPH_SETS[groupName] || GLYPH_SETS.fillMid;
    const groupSeed = hashStr(groupName);

    const weighted = clamp(tone + metrics.contrast * 0.12, 0, 1);
    const baseIdx = Math.floor(weighted * (glyphs.length - 0.0001));
    const jitter = Math.round((pseudoRandom(index + baseIdx, groupSeed) - 0.5) * 2.4);
    const candidateIdx = clamp(baseIdx + jitter, 0, glyphs.length - 1);
    let glyph = glyphs[candidateIdx];

    // Temporal coherence
    const prev = prevGlyphs[index];
    const prevG = prevGroups[index];
    if (prev && prevG === groupName && glyphs.includes(prev) && pseudoRandom(index + candidateIdx, groupSeed + 17) < 0.82) {
      glyph = prev;
    }

    // Dark areas prefer slim symbols
    if ((groupName === 'background' || groupName === 'fillLight') && tone < 0.28 && pseudoRandom(index, groupSeed + 31) < 0.74) {
      const ds = GLYPH_SETS.darkSymbols;
      glyph = ds[Math.floor(pseudoRandom(index, groupSeed + 67) * ds.length)];
    }

    // Edge symbols bias
    const symbolBias = groupName === 'background' ? 0.72
      : groupName.startsWith('edge') ? 0.3
        : groupName === 'fillLight' ? 0.28 : 0.06;
    if ((groupName.startsWith('edge') || groupName === 'background' || groupName === 'fillLight')
      && metrics.edge + (1 - tone) * 0.1 > 0.18
      && pseudoRandom(index, groupSeed + 43) < symbolBias) {
      const es = GLYPH_SETS.edgeSymbols;
      glyph = es[Math.floor(pseudoRandom(index, groupSeed + 91) * es.length)];
    }

    prevGlyphs[index] = glyph;
    prevGroups[index] = groupName;
    return { glyph, groupName };
  }

  // --- Main render ---
  function render(video, mask, maskWidth, maskHeight) {
    if (!width || !cols) return;

    // 1. Sample video (mirrored)
    sampleCtx.save();
    sampleCtx.scale(-1, 1);
    sampleCtx.drawImage(video, -sampleW, 0, sampleW, sampleH);
    sampleCtx.restore();

    const imageData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
    const pixels = imageData.data;
    const luma = extractLuma(pixels);

    // Also sample color at cell resolution
    colorCtx.save();
    colorCtx.scale(-1, 1);
    colorCtx.drawImage(video, -cols, 0, cols, rows);
    colorCtx.restore();
    const colorData = colorCtx.getImageData(0, 0, cols, rows).data;

    // Build mask at cell resolution
    let cellMask = null;
    if (mask) {
      cellMask = new Float32Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        const my = Math.min(Math.floor((r + 0.5) / rows * maskHeight), maskHeight - 1);
        for (let c = 0; c < cols; c++) {
          // Mask is un-mirrored, but we drew video mirrored, so mirror mask x
          const mx = Math.min(Math.floor((1 - (c + 0.5) / cols) * maskWidth), maskWidth - 1);
          cellMask[r * cols + c] = mask[my * maskWidth + mx];
        }
      }
    }

    // 2. Render
    outCtx.save();
    outCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Black background
    outCtx.globalAlpha = 1;
    outCtx.fillStyle = BG_COLOR;
    outCtx.fillRect(0, 0, width, height);

    outCtx.font = glyphFont;
    outCtx.textAlign = 'center';
    outCtx.textBaseline = 'middle';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const normX = (col + 0.5) / cols;
        const normY = (row + 0.5) / rows;
        const m = sampleMetrics(luma, normX, normY);

        // Smooth tone
        let tone = prevTones[i] * TONE_SMOOTHING + m.tone * (1 - TONE_SMOOTHING);
        prevTones[i] = tone;

        const blended = clamp(tone * 0.9 + m.contrast * 0.12 + m.edge * 0.04, 0, 1);
        const { glyph } = selectGlyph(i, blended, m);

        if (glyph === ' ') continue;

        const x = col * cellW;
        const y = row * cellH;

        const isPerson = cellMask ? cellMask[i] > 0.5 : false;

        // Base tile for bright areas
        const useTile = blended >= BRIGHT_TILE_THRESHOLD;
        if (useTile) {
          const tileAlpha = quantize(blended * 0.82, BASE_ALPHA_STEPS);
          const insetX = cellW * clamp(0.18 - blended * 0.08, 0.01, 0.16);
          const insetY = cellH * clamp(0.2 - blended * 0.1, 0.015, 0.18);
          outCtx.globalAlpha = tileAlpha;

          if (isPerson) {
            const ci = i * 4;
            outCtx.fillStyle = `rgb(${colorData[ci]},${colorData[ci + 1]},${colorData[ci + 2]})`;
          } else {
            outCtx.fillStyle = GLYPH_COLOR;
          }
          outCtx.fillRect(
            x + insetX, y + insetY,
            Math.max(1, cellW - insetX * 2),
            Math.max(1, cellH - insetY * 2)
          );
        }

        // Glyph
        const glyphAlpha = quantize(
          clamp(0.16 + blended * 0.5 + m.edge * 0.16, 0, 1),
          GLYPH_ALPHA_STEPS
        );
        outCtx.globalAlpha = glyphAlpha;

        if (isPerson) {
          const ci = i * 4;
          outCtx.fillStyle = `rgb(${colorData[ci]},${colorData[ci + 1]},${colorData[ci + 2]})`;
        } else {
          if (useTile) {
            outCtx.fillStyle = BG_COLOR; // inverse text on bright tile
          } else {
            outCtx.fillStyle = GLYPH_COLOR;
          }
        }

        outCtx.fillText(glyph, x + cellW * 0.5, y + cellH * 0.52);
      }
    }

    outCtx.globalAlpha = 1;
    outCtx.restore();
  }

  function destroy() {}

  resize();

  return { render, resize, destroy };
}
