// ── Chat Window Module ─────────────────────────────────────────────────────
// Renders chat UI on the main canvas BEHIND the ASCII art layer.
// Uses half-size pixels and noise transition effects.

const NOISE_GLYPHS = ["#", "*", ".", ":", "~", "ㅡ", "ㅣ", "/", "\\", "+", "0", "1", "ㄱ", "ㅂ", "ㅎ"];
const BORDER_H = "ㅡ";
const BORDER_V = "ㅣ";
const BORDER_TL = "+";
const BORDER_TR = "+";
const BORDER_BL = "+";
const BORDER_BR = "+";
const BORDER_DIV_L = "+";
const BORDER_DIV_R = "+";

const APPEAR_DURATION = 800;
const DISAPPEAR_DURATION = 600;
const CHAR_INTERVAL = 60;
const CURSOR_BLINK_MS = 530;

const CHAT_PADDING_X = 0.08;   // 8% from edges
const CHAT_PADDING_Y = 0.06;   // 6% from top/bottom
const INPUT_ROWS = 2;          // rows reserved for input area

const FONT_FAMILY = '"D2Coding", "Nanum Gothic Coding", "Noto Sans Mono CJK KR", monospace';

export function createChatWindow({ chatInput, chatApi }) {
  // ── State ──
  let state = "hidden"; // hidden | appearing | visible | disappearing
  let noiseProgress = 0;
  let activeModeDigit = null;
  let activeModeColor = "#fff";
  let handOrigin = { x: 0.5, y: 0.5 };

  // ── Messages ──
  let messages = []; // { role: 'user'|'assistant', content: string, displayedChars: number, complete: boolean }
  let scrollOffset = 0;
  let isWaitingForAI = false;

  // ── Input ──
  let inputText = "";
  let composingText = "";
  let lastTimestamp = 0;

  // ── Grid dimensions (recalculated on resize) ──
  let canvasW = 0;
  let canvasH = 0;
  let chatFontSize = 10;
  let chatCellW = 8;
  let chatCellH = 10;
  let chatCols = 0;
  let chatRows = 0;
  let chatOriginX = 0;
  let chatOriginY = 0;
  let chatPixelW = 0;
  let chatPixelH = 0;
  let messageRows = 0; // rows available for messages (chatRows - INPUT_ROWS - 2 for borders)

  // ── Pixel coordinate cache for isChatCell ──
  let chatLeft = 0;
  let chatTop = 0;
  let chatRight = 0;
  let chatBottom = 0;

  // ── Setup input listeners ──
  function setupInput() {
    chatInput.addEventListener("input", () => {
      if (!chatInput.dataset.composing) {
        inputText = chatInput.value;
      }
    });

    chatInput.addEventListener("compositionstart", () => {
      chatInput.dataset.composing = "true";
    });

    chatInput.addEventListener("compositionupdate", (e) => {
      composingText = e.data || "";
    });

    chatInput.addEventListener("compositionend", () => {
      delete chatInput.dataset.composing;
      composingText = "";
      inputText = chatInput.value;
    });

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !chatInput.dataset.composing) {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text && !isWaitingForAI) {
          submitMessage(text);
          chatInput.value = "";
          inputText = "";
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        deactivate();
      }
    });
  }

  setupInput();

  // ── Submit message ──
  async function submitMessage(text) {
    messages.push({
      role: "user",
      content: text,
      displayedChars: text.length,
      complete: true
    });
    autoScroll();

    isWaitingForAI = true;
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await chatApi.sendMessage(history);
      messages.push({
        role: "assistant",
        content: response.content,
        displayedChars: 0,
        complete: false,
        lastCharTime: lastTimestamp
      });
      autoScroll();
    } catch {
      messages.push({
        role: "assistant",
        content: "...",
        displayedChars: 3,
        complete: true
      });
    }
    isWaitingForAI = false;
  }

  // ── Auto scroll to bottom ──
  function autoScroll() {
    const totalLines = getTotalMessageLines();
    if (totalLines > messageRows) {
      scrollOffset = totalLines - messageRows;
    }
  }

  // ── Word wrap helper ──
  function wrapText(text, maxCols) {
    const lines = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxCols) {
        lines.push(remaining);
        break;
      }
      let breakAt = maxCols;
      // Try to break at space
      const spaceIdx = remaining.lastIndexOf(" ", maxCols);
      if (spaceIdx > maxCols * 0.3) {
        breakAt = spaceIdx + 1;
      }
      lines.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt);
    }
    return lines;
  }

  // ── Get total lines for all messages ──
  function getTotalMessageLines() {
    const contentCols = chatCols - 4; // 2 border + 2 padding
    let total = 0;
    for (const msg of messages) {
      const prefix = msg.role === "user" ? "> " : "< ";
      const visibleContent = msg.content.slice(0, msg.displayedChars);
      const fullText = prefix + visibleContent;
      const lines = wrapText(fullText, contentCols);
      total += lines.length;
      total += 1; // spacing between messages
    }
    return Math.max(0, total - 1); // remove last spacing
  }

  // ── Resize ──
  function resize(w, h, mainFontSize, mainCellW, mainCellH) {
    canvasW = w;
    canvasH = h;
    chatFontSize = Math.max(6, mainFontSize / 2);
    chatCellW = mainCellW / 2;
    chatCellH = mainCellH / 2;

    // Chat occupies full canvas with padding
    chatOriginX = Math.floor(canvasW * CHAT_PADDING_X);
    chatOriginY = Math.floor(canvasH * CHAT_PADDING_Y);
    chatPixelW = Math.floor(canvasW * (1 - CHAT_PADDING_X * 2));
    chatPixelH = Math.floor(canvasH * (1 - CHAT_PADDING_Y * 2));
    chatCols = Math.max(20, Math.floor(chatPixelW / chatCellW));
    chatRows = Math.max(10, Math.floor(chatPixelH / chatCellH));
    messageRows = Math.max(4, chatRows - INPUT_ROWS - 4); // -4 for borders + divider + title

    // Cache bounds for isChatCell
    chatLeft = chatOriginX;
    chatTop = chatOriginY;
    chatRight = chatOriginX + chatCols * chatCellW;
    chatBottom = chatOriginY + chatRows * chatCellH;
  }

  // ── Activate ──
  function activate(digit, color, origin) {
    if (state === "visible" && activeModeDigit === digit) {
      // Toggle off if same mode
      deactivate();
      return;
    }
    activeModeDigit = digit;
    activeModeColor = color;
    handOrigin = origin || { x: 0.5, y: 0.5 };
    state = "appearing";
    noiseProgress = 0;
    messages = [];
    scrollOffset = 0;
    isWaitingForAI = false;
    chatInput.value = "";
    inputText = "";
    composingText = "";
    chatInput.focus();
  }

  // ── Deactivate ──
  function deactivate() {
    if (state === "hidden" || state === "disappearing") return;
    state = "disappearing";
    chatInput.blur();
  }

  // ── Update (called every frame) ──
  function update(timestamp) {
    lastTimestamp = timestamp;
    if (state === "hidden") return;

    const dt = 16.67; // approximate frame delta

    if (state === "appearing") {
      noiseProgress = Math.min(1, noiseProgress + dt / APPEAR_DURATION);
      if (noiseProgress >= 1) {
        state = "visible";
        chatInput.focus();
      }
    }

    if (state === "disappearing") {
      noiseProgress = Math.max(0, noiseProgress - dt / DISAPPEAR_DURATION);
      if (noiseProgress <= 0) {
        state = "hidden";
        activeModeDigit = null;
      }
    }

    // Typewriter effect for incomplete AI messages
    for (const msg of messages) {
      if (!msg.complete && msg.displayedChars < msg.content.length) {
        if (timestamp - (msg.lastCharTime || 0) >= CHAR_INTERVAL) {
          msg.displayedChars++;
          msg.lastCharTime = timestamp;
          if (msg.displayedChars >= msg.content.length) {
            msg.complete = true;
          }
          autoScroll();
        }
      }
    }
  }

  // ── Per-cell noise reveal progress ──
  function getCellRevealProgress(cellX, cellY, globalProgress) {
    const nx = cellX / canvasW;
    const ny = cellY / canvasH;
    const dx = nx - (handOrigin.x || 0.5);
    const dy = ny - (handOrigin.y || 0.5);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 1.2;
    const cellDelay = dist / maxDist * 0.5;
    return Math.max(0, Math.min(1, (globalProgress - cellDelay) / (1 - cellDelay + 0.01)));
  }

  // ── Render background (called BEFORE renderAdaptiveCells) ──
  function renderBackground(ctx) {
    if (state === "hidden") return;

    const prevFont = ctx.font;
    const prevAlign = ctx.textAlign;
    const prevBaseline = ctx.textBaseline;

    ctx.font = Math.max(6, chatFontSize) + "px " + FONT_FAMILY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (state === "appearing" || state === "disappearing") {
      renderNoiseTransition(ctx);
    } else {
      renderFullChat(ctx);
    }

    ctx.font = prevFont;
    ctx.textAlign = prevAlign;
    ctx.textBaseline = prevBaseline;
  }

  // ── Noise transition ──
  function renderNoiseTransition(ctx) {
    for (let r = 0; r < chatRows; r++) {
      for (let c = 0; c < chatCols; c++) {
        const x = chatOriginX + c * chatCellW;
        const y = chatOriginY + r * chatCellH;
        const cellProg = getCellRevealProgress(x, y, noiseProgress);

        if (cellProg <= 0) continue;

        if (cellProg < 0.4) {
          // Phase 1: random noise glyphs
          const glyph = NOISE_GLYPHS[Math.floor(Math.random() * NOISE_GLYPHS.length)];
          ctx.globalAlpha = cellProg / 0.4 * 0.6;
          ctx.fillStyle = activeModeColor;
          ctx.fillText(glyph, x + chatCellW * 0.5, y + chatCellH * 0.5);
        } else if (cellProg < 0.75) {
          // Phase 2: stabilizing — mix noise and actual
          const stabilize = (cellProg - 0.4) / 0.35;
          if (Math.random() > stabilize) {
            const glyph = NOISE_GLYPHS[Math.floor(Math.random() * NOISE_GLYPHS.length)];
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = activeModeColor;
            ctx.fillText(glyph, x + chatCellW * 0.5, y + chatCellH * 0.5);
          } else {
            renderChatCellAt(ctx, r, c, 0.6 + stabilize * 0.4);
          }
        } else {
          // Phase 3: fully revealed
          renderChatCellAt(ctx, r, c, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Full chat render ──
  function renderFullChat(ctx) {
    for (let r = 0; r < chatRows; r++) {
      for (let c = 0; c < chatCols; c++) {
        renderChatCellAt(ctx, r, c, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Render a single chat cell ──
  function renderChatCellAt(ctx, row, col, alpha) {
    const x = chatOriginX + col * chatCellW;
    const y = chatOriginY + row * chatCellH;

    const isBorderTop = row === 0;
    const isBorderBottom = row === chatRows - 1;
    const isBorderLeft = col === 0;
    const isBorderRight = col === chatCols - 1;
    const isDividerRow = row === chatRows - INPUT_ROWS - 1;

    // ── Border cells ──
    if (isBorderTop || isBorderBottom || isDividerRow) {
      if (isBorderLeft) {
        drawBorderChar(ctx, x, y, alpha, isBorderTop ? BORDER_TL : (isBorderBottom ? BORDER_BL : BORDER_DIV_L));
      } else if (isBorderRight) {
        drawBorderChar(ctx, x, y, alpha, isBorderTop ? BORDER_TR : (isBorderBottom ? BORDER_BR : BORDER_DIV_R));
      } else {
        drawBorderChar(ctx, x, y, alpha, BORDER_H);
      }
      return;
    }

    if (isBorderLeft || isBorderRight) {
      drawBorderChar(ctx, x, y, alpha, BORDER_V);
      return;
    }

    // ── Title row (row 1) ──
    if (row === 1) {
      const title = " MODE " + (activeModeDigit || "?") + " ";
      const titleStart = Math.floor((chatCols - 2 - title.length) / 2);
      const innerCol = col - 1;
      if (innerCol >= titleStart && innerCol < titleStart + title.length) {
        const ch = title[innerCol - titleStart];
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = activeModeColor;
        ctx.fillText(ch, x + chatCellW * 0.5, y + chatCellH * 0.5);
      }
      return;
    }

    // ── Input area ──
    if (row > chatRows - INPUT_ROWS - 1) {
      renderInputCell(ctx, row, col, alpha);
      return;
    }

    // ── Message area (rows 2 to divider) ──
    renderMessageCell(ctx, row, col, alpha);
  }

  // ── Draw border character ──
  function drawBorderChar(ctx, x, y, alpha, ch) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = activeModeColor;
    ctx.fillText(ch, x + chatCellW * 0.5, y + chatCellH * 0.5);
  }

  // ── Render message cell ──
  function renderMessageCell(ctx, row, col, alpha) {
    const contentCols = chatCols - 4;
    const innerCol = col - 2; // 1 border + 1 padding
    if (innerCol < 0 || innerCol >= contentCols) return;

    // Build visible lines
    const allLines = [];
    for (const msg of messages) {
      const prefix = msg.role === "user" ? "> " : "< ";
      const visibleContent = msg.content.slice(0, msg.displayedChars);
      const fullText = prefix + visibleContent;
      const wrapped = wrapText(fullText, contentCols);
      const color = msg.role === "user" ? "#e8e8e8" : activeModeColor;
      for (const line of wrapped) {
        allLines.push({ text: line, color });
      }
      allLines.push({ text: "", color: "#000" }); // spacing
    }

    // Waiting indicator
    if (isWaitingForAI) {
      const dots = ".".repeat(1 + Math.floor((lastTimestamp / 400) % 3));
      allLines.push({ text: "< " + dots, color: activeModeColor });
    }

    // Remove trailing empty
    while (allLines.length > 0 && allLines[allLines.length - 1].text === "") {
      allLines.pop();
    }

    const messageAreaStart = 3; // rows after title (row 0=border, 1=title, 2=blank)
    const lineRow = row - messageAreaStart;
    const lineIdx = lineRow + scrollOffset;

    if (lineIdx < 0 || lineIdx >= allLines.length) return;

    const lineData = allLines[lineIdx];
    if (innerCol < lineData.text.length) {
      const ch = lineData.text[innerCol];
      if (ch !== " ") {
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = lineData.color;
        ctx.fillText(ch, chatOriginX + col * chatCellW + chatCellW * 0.5,
          chatOriginY + row * chatCellH + chatCellH * 0.5);
      }
    }
  }

  // ── Render input cell ──
  function renderInputCell(ctx, row, col, alpha) {
    const innerCol = col - 2;
    const contentCols = chatCols - 4;
    if (innerCol < 0 || innerCol >= contentCols) return;

    const inputRow = row - (chatRows - INPUT_ROWS);
    if (inputRow !== 0) return; // only first input row

    const displayText = composingText ? inputText + composingText : inputText;
    const prompt = "> " + displayText;
    const cursorPos = prompt.length;
    const showCursor = state === "visible" && Math.floor(lastTimestamp / CURSOR_BLINK_MS) % 2 === 0;

    if (innerCol < prompt.length) {
      const ch = prompt[innerCol];
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = "#e8e8e8";
      ctx.fillText(ch, chatOriginX + col * chatCellW + chatCellW * 0.5,
        chatOriginY + row * chatCellH + chatCellH * 0.5);
    } else if (innerCol === cursorPos && showCursor) {
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = activeModeColor;
      ctx.fillText("_", chatOriginX + col * chatCellW + chatCellW * 0.5,
        chatOriginY + row * chatCellH + chatCellH * 0.5);
    }
  }

  // ── Check if a pixel coordinate falls within the chat area ──
  function isChatRegion(pixelX, pixelY) {
    if (state === "hidden") return false;
    let effectiveProgress = state === "visible" ? 1 : noiseProgress;
    if (effectiveProgress < 0.5) return false;
    return pixelX >= chatLeft && pixelX <= chatRight &&
           pixelY >= chatTop && pixelY <= chatBottom;
  }

  // ── Public API ──
  return {
    activate,
    deactivate,
    update,
    renderBackground,
    resize,
    isChatRegion,
    isActive() { return state !== "hidden"; },
    getState() { return state; }
  };
}
