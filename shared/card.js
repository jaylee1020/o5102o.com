import { registerServiceWorker } from "/shared/site.js";

const CONTACT_EMAIL = "jyounglee1020@gmail.com";
const CONTACT_API_ENDPOINT = "/api/contact";
const PHONE_PATTERN = /^(01[016789]\d{7,8}|0[2-6][1-9]\d{6,7}|\+82\d{9,10})$/;

const form = document.getElementById("form");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const placeInput = document.getElementById("place");
const messageElement = document.getElementById("msg");
const submitButton = document.getElementById("sub");
const submitLabel = submitButton.querySelector(".btn-label");
const completionElement = document.getElementById("done");
const downloadButtons = [document.getElementById("vcardBtn"), document.getElementById("vcardBtn2")];

let isSending = false;

function downloadVCard() {
  const cardLines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:LEE;JOOYOUNG;;;",
    "FN:JOOYOUNG LEE",
    "NICKNAME:o5102o",
    "TITLE:Designer & Developer",
    `EMAIL;TYPE=INTERNET:${CONTACT_EMAIL}`,
    "URL:https://o5102o.com",
    "X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/o5102o",
    "X-SOCIALPROFILE;TYPE=github:https://github.com/jaylee1020",
    "NOTE:o5102o.com",
    "END:VCARD",
  ];

  const blob = new Blob([cardLines.join("\r\n")], {
    type: "text/vcard;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "o5102o.vcf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function clearFeedback() {
  messageElement.textContent = "";
  messageElement.className = "msg";
}

function setMessage(text, status = "") {
  messageElement.textContent = text;
  messageElement.className = status ? `msg ${status}` : "msg";
}

function setMessageLink(text, href, linkLabel) {
  messageElement.textContent = "";
  messageElement.className = "msg error";
  messageElement.append(document.createTextNode(text));

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.textContent = linkLabel;
  messageElement.appendChild(anchor);
}

function hideCompletionState() {
  completionElement.classList.remove("visible");
}

function clearInvalidState(input) {
  input.classList.remove("invalid", "shake");
}

function shakeInvalidInput(input) {
  input.classList.add("invalid", "shake");
  input.addEventListener(
    "animationend",
    () => {
      input.classList.remove("shake");
    },
    { once: true }
  );
}

function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function normalizePhoneNumber(value) {
  return value.replace(/[\s\-()]/g, "");
}

function setSubmittingState(nextState) {
  isSending = nextState;
  submitButton.disabled = nextState;
  submitLabel.textContent = nextState ? "저장 중..." : "보내기";
  form.setAttribute("aria-busy", String(nextState));
}

function createPayload() {
  return {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim() || null,
    place: placeInput.value.trim() || null,
    source: "card.o5102o.com",
    createdAt: new Date().toISOString(),
  };
}

function buildFallbackMailto(payload) {
  const subject = encodeURIComponent(`[card] ${payload.name}`);
  const body = encodeURIComponent(
    `이름: ${payload.name}\n전화번호: ${payload.phone || "-"}\n만난 곳: ${payload.place || "-"}`
  );

  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function validatePayload(payload) {
  if (!payload.name) {
    shakeInvalidInput(nameInput);
    setMessage("이름을 입력해 주세요.", "error");
    nameInput.focus();
    return false;
  }

  if (payload.phone && !PHONE_PATTERN.test(normalizePhoneNumber(payload.phone))) {
    shakeInvalidInput(phoneInput);
    setMessage("전화번호 형식이 맞지 않습니다.", "error");
    phoneInput.focus();
    return false;
  }

  return true;
}

async function submitContact(payload) {
  const response = await fetch(CONTACT_API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Contact request failed: ${response.status}`);
  }
}

downloadButtons.filter(Boolean).forEach((button) => {
  button.addEventListener("click", downloadVCard);
});

phoneInput.addEventListener("input", () => {
  const selectionStart = phoneInput.selectionStart ?? phoneInput.value.length;
  const currentValue = phoneInput.value;
  const formattedValue = formatPhoneNumber(currentValue);

  if (formattedValue !== currentValue) {
    const nextPosition = selectionStart + (formattedValue.length - currentValue.length);
    phoneInput.value = formattedValue;
    phoneInput.setSelectionRange(nextPosition, nextPosition);
  }

  clearInvalidState(phoneInput);
  clearFeedback();
});

[nameInput, placeInput].forEach((input) => {
  input.addEventListener("input", () => {
    clearInvalidState(input);
    clearFeedback();
    hideCompletionState();
  });
});

phoneInput.addEventListener("input", hideCompletionState);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSending) {
    return;
  }

  const payload = createPayload();
  if (!validatePayload(payload)) {
    return;
  }

  clearFeedback();
  setSubmittingState(true);

  try {
    await submitContact(payload);
    setMessage("저장 완료.", "ok");
    form.reset();
    completionElement.classList.add("visible");
  } catch (error) {
    setMessageLink("서버 오류. ", buildFallbackMailto(payload), "이메일로 보내기");
    console.error(error);
  } finally {
    setSubmittingState(false);
  }
});

registerServiceWorker();
