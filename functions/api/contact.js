const CONTACT_TTL_SECONDS = 60 * 60 * 24 * 365;
const WEBHOOK_COLOR = 0x3f8a57;
const MAX_LENGTH = Object.freeze({
  name: 40,
  phone: 20,
  place: 60,
  source: 50,
});

const CORS_HEADERS = Object.freeze({
  "Access-Control-Allow-Origin": "https://card.o5102o.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

function normalizeText(value, maxLength) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function createContactRecord(payload, request) {
  const name = normalizeText(payload?.name, MAX_LENGTH.name);
  if (!name) {
    return { error: "name is required" };
  }

  return {
    contact: {
      name,
      phone: normalizeText(payload?.phone, MAX_LENGTH.phone),
      place: normalizeText(payload?.place, MAX_LENGTH.place),
      source: normalizeText(payload?.source, MAX_LENGTH.source) || "card.o5102o.com",
      createdAt: normalizeText(payload?.createdAt, 64) || new Date().toISOString(),
      ip: request.headers.get("CF-Connecting-IP") || null,
      country: request.headers.get("CF-IPCountry") || null,
    },
  };
}

async function storeContact(env, id, contact) {
  if (!env.CONTACTS) {
    return;
  }

  await env.CONTACTS.put(id, JSON.stringify(contact), {
    metadata: {
      name: contact.name,
      createdAt: contact.createdAt,
    },
    expirationTtl: CONTACT_TTL_SECONDS,
  });
}

function createWebhookPayload(contact) {
  return {
    embeds: [
      {
        title: "새로운 연락처",
        color: WEBHOOK_COLOR,
        fields: [
          { name: "이름", value: contact.name, inline: true },
          { name: "전화번호", value: contact.phone || "미입력", inline: true },
          { name: "만난 곳", value: contact.place || "미입력", inline: true },
        ],
        footer: {
          text: `${contact.source} · ${contact.country || "unknown"}`,
        },
        timestamp: contact.createdAt,
      },
    ],
  };
}

function queueWebhookNotification(context, env, contact) {
  if (!env.WEBHOOK_URL) {
    return;
  }

  context.waitUntil(
    fetch(env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createWebhookPayload(contact)),
    }).catch((error) => {
      console.error("Webhook failed:", error);
    })
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Invalid contact payload:", error);
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { contact, error } = createContactRecord(payload, request);
  if (error) {
    return jsonResponse({ error }, 400);
  }

  const id = crypto.randomUUID();

  try {
    await storeContact(env, id, contact);
  } catch (storageError) {
    console.error("Failed to store contact:", storageError);
    return jsonResponse({ error: "Failed to save contact" }, 500);
  }

  queueWebhookNotification(context, env, contact);
  return jsonResponse({ ok: true, id }, 201);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
}
