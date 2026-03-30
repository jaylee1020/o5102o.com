/**
 * Cloudflare Pages Function: Apple Wallet Pass
 *
 * Endpoint: GET /api/wallet
 *
 * Requires Apple Developer certificates stored as Cloudflare secrets:
 *   PASS_CERTIFICATE, PASS_PRIVATE_KEY, PASS_TYPE_ID, TEAM_ID
 *
 * Alternative: pre-generate a static .pkpass with passkit-generator (npm)
 * and serve from R2 or static assets.
 */

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.PASS_CERTIFICATE || !env.PASS_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({
        error: 'Apple Wallet pass not configured',
        fallback: 'vcard',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // TODO: Implement pass signing with PKCS7/CMS.
  // For now, client-side falls back to vCard download.
  return new Response(
    JSON.stringify({ error: 'Pass generation not yet implemented' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
}
