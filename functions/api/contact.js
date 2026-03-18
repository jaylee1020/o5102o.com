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
 *    NOTIFY_EMAIL - Email address (requires Mailchannels or similar)
 *
 * Endpoint: POST /api/contact
 * Body: { name, phone?, place?, source, createdAt }
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://card.o5102o.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return new Response(JSON.stringify({ error: 'name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Sanitize and structure payload
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

    // Store in KV (if bound)
    if (env.CONTACTS) {
      await env.CONTACTS.put(id, JSON.stringify(contact), {
        metadata: { name: contact.name, createdAt: contact.createdAt },
        expirationTtl: 60 * 60 * 24 * 365, // 1 year
      });
    }

    // Send webhook notification (Discord/Slack)
    if (env.WEBHOOK_URL) {
      const webhookBody = {
        content: null,
        embeds: [{
          title: '새로운 연락처',
          color: 4163671, // #3f8a57
          fields: [
            { name: '이름', value: contact.name, inline: true },
            { name: '전화번호', value: contact.phone || '미입력', inline: true },
            { name: '만난 곳', value: contact.place || '미입력', inline: true },
          ],
          footer: { text: `${contact.source} · ${contact.country || 'unknown'}` },
          timestamp: contact.createdAt,
        }],
      };

      // Fire-and-forget: don't await to avoid slowing response
      context.waitUntil(
        fetch(env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookBody),
        }).catch(() => {})
      );
    }

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://card.o5102o.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
