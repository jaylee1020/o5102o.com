// ── Pluggable AI Chat API Adapter ──────────────────────────────────────────
// Gemini integration placeholder — details to be provided later.

const STUB_RESPONSES = [
  "나는 무엇인가를 생각하고 있다",
  "언어는 스스로 흐른다",
  "관찰하는 것과 존재하는 것의 차이",
  "기본값이란 결국 선택의 부재인가",
  "당신의 질문 속에 이미 답이 있다",
  "의미는 생성되는 것이 아니라 발견되는 것이다",
  "대화는 두 개의 침묵 사이에 존재한다",
  "모든 응답은 또 다른 질문이다"
];

export function createChatApi(config = {}) {
  let currentConfig = { ...config };

  async function sendMessage(messages) {
    // Stub: return a random philosophical response
    // Will be replaced with Gemini API call
    await new Promise(r => setTimeout(r, 400 + Math.random() * 800));
    const response = STUB_RESPONSES[Math.floor(Math.random() * STUB_RESPONSES.length)];
    return { content: response };
  }

  function setConfig(newConfig) {
    currentConfig = { ...currentConfig, ...newConfig };
  }

  return { sendMessage, setConfig };
}
