/**
 * Cloudflare Pages Function: Contact API
 *
 * Receives contact form submissions and stores them.
 *
 * Setup:
 * 1. Create a KV namespace in Cloudflare dashboard:
 *    Settings > Functions > KV namespace bindings
 *    Binding name: CONTACTS
 *
 * 2. (Optional) Set environment variables for notifications:
 *    WEBHOOK_URL  - Discord/Slack webhook for instant notifications
 *
 * Endpoint: POST /api/contact
 * Body: { name, phone?, place?, source, createdAt }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://card.o5102o.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return jsonResponse({ error: 'name is required' }, 400);
    }

    const contact = {
      name: data.name.trim().slice(0, 40),
      phone: data.phone ? String(data.phone).trim().slice(0, 20) : null,
      place: data.place ? String(data.place).trim().slice(0, 60) : null,
      source: String(data.source || 'card.o5102o.com').slice(0, 50),
      createdAt: data.createdAt || new Date().toISOString(),
      ip: request.headers.get('CF-Connecting-IP') || null,
      country: request.headers.get('CF-IPCountry') || null,
    };

    const id = crypto.randomUUID();

    if (env.CONTACTS) {
      await env.CONTACTS.put(id, JSON.stringify(contact), {
        metadata: { name: contact.name, createdAt: contact.createdAt },
        expirationTtl: 60 * 60 * 24 * 365,
      });
    }

    if (env.WEBHOOK_URL) {
      context.waitUntil(
        fetch(env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '새로운 연락처',
              color: 0x3f8a57,
              fields: [
                { name: '이름', value: contact.name, inline: true },
                { name: '전화번호', value: contact.phone || '미입력', inline: true },
                { name: '만난 곳', value: contact.place || '미입력', inline: true },
              ],
              footer: { text: `${contact.source} · ${contact.country || 'unknown'}` },
              timestamp: contact.createdAt,
            }],
          }),
        }).catch((err) => console.error('Webhook failed:', err))
      );
    }

    return jsonResponse({ ok: true, id }, 201);
  } catch (err) {
    console.error('Contact API error:', err);
    return jsonResponse({ error: 'Invalid request' }, 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { ...CORS_HEADERS, 'Access-Control-Max-Age': '86400' },
  });
}
