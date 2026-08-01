/**
 * Cloudflare Pages Function: contact form
 *
 * Required binding:
 *   CONTACTS — KV namespace used for submissions and a fallback rate limit.
 */

const ALLOWED_ORIGIN = 'https://card.o5102o.com';
const MAX_BODY_BYTES = 8 * 1024;
const MAX_REQUESTS_PER_HOUR = 5;
const CONTACT_RETENTION_SECONDS = 60 * 60 * 24 * 90;
const PHONE_PATTERN = /^(010\d{8}|\+8210\d{8})$/;

const BASE_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  Vary: 'Origin',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: BASE_HEADERS });
}

function normalizePhone(value) {
  const input = String(value || '').trim();
  if (input.startsWith('+')) return '+' + input.slice(1).replace(/\D/g, '');
  return input.replace(/\D/g, '');
}

async function hashValue(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function readLimitedText(request) {
  if (!request.body || typeof request.body.getReader !== 'function') {
    const text = await request.text();
    return {
      text,
      tooLarge: new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES,
    };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { text: '', tooLarge: true };
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return { text, tooLarge: false };
}

// Workers KV is eventually consistent, so this only dampens casual abuse.
// Configure an edge WAF rate-limit rule for /api/contact in production.
async function isRateLimited(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const key = 'rate:' + await hashValue(ip + ':' + hour);
  const count = Number.parseInt(await env.CONTACTS.get(key), 10) || 0;

  if (count >= MAX_REQUESTS_PER_HOUR) return true;

  await env.CONTACTS.put(key, String(count + 1), { expirationTtl: 60 * 60 });
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin');
  if (origin && origin !== ALLOWED_ORIGIN) {
    return jsonResponse({ error: 'origin not allowed' }, 403);
  }

  if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
    return jsonResponse({ error: 'content type must be application/json' }, 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'request body is too large' }, 413);
  }

  let data;
  try {
    const body = await readLimitedText(request);
    if (body.tooLarge) {
      return jsonResponse({ error: 'request body is too large' }, 413);
    }
    data = JSON.parse(body.text);
  } catch (_error) {
    return jsonResponse({ error: 'invalid json' }, 400);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonResponse({ error: 'request body must be an object' }, 400);
  }

  if (data.contactUrlConfirm || data.website) {
    return jsonResponse({ ok: true }, 201);
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    return jsonResponse({ error: 'name is required' }, 400);
  }

  const name = data.name.trim();
  if (name.length > 40) {
    return jsonResponse({ error: 'name is too long' }, 400);
  }

  const phone = normalizePhone(data.phone);
  if (!PHONE_PATTERN.test(phone)) {
    return jsonResponse({ error: 'valid Korean mobile phone is required' }, 400);
  }

  if (data.consent !== true) {
    return jsonResponse({ error: 'consent is required' }, 400);
  }

  if (data.place != null && typeof data.place !== 'string') {
    return jsonResponse({ error: 'place must be a string' }, 400);
  }

  const place = data.place == null ? null : data.place.trim();
  if (place && place.length > 60) {
    return jsonResponse({ error: 'place is too long' }, 400);
  }

  if (!env.CONTACTS) {
    return jsonResponse({ error: 'contact service is not configured' }, 503);
  }

  try {
    if (await isRateLimited(env, request)) {
      return jsonResponse({ error: 'too many requests' }, 429);
    }
  } catch (error) {
    console.error('Contact rate limit failed:', error);
    return jsonResponse({ error: 'contact service unavailable' }, 503);
  }

  const contact = {
    name,
    phone,
    place: place || null,
    source: 'card.o5102o.com',
    createdAt: new Date().toISOString(),
    retentionDays: 90,
  };

  const id = crypto.randomUUID();
  try {
    await env.CONTACTS.put('contact:' + id, JSON.stringify(contact), {
      metadata: { name: contact.name, createdAt: contact.createdAt },
      expirationTtl: CONTACT_RETENTION_SECONDS,
    });

    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    console.error('Contact delivery failed:', error);
    return jsonResponse({ error: 'contact service unavailable' }, 503);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...BASE_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}
