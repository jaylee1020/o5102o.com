/**
 * Cloudflare Pages Function: Apple Wallet Pass
 *
 * Generates and serves an Apple Wallet (.pkpass) pass file.
 *
 * ══════════════════════════════════════════════════════════
 *  SETUP REQUIRED - Apple Developer Program
 * ══════════════════════════════════════════════════════════
 *
 * Apple Wallet passes require server-side signing with Apple certificates.
 * Follow these steps to enable this endpoint:
 *
 * 1. Enroll in Apple Developer Program ($99/year)
 *    https://developer.apple.com/programs/
 *
 * 2. Create a Pass Type ID:
 *    - Go to Certificates, Identifiers & Profiles
 *    - Register a new Pass Type ID (e.g., pass.com.o5102o.card)
 *
 * 3. Generate a Pass Type ID Certificate:
 *    - Select your Pass Type ID
 *    - Create a certificate signing request (CSR)
 *    - Download the certificate (.cer)
 *    - Export as .pem from Keychain Access
 *
 * 4. Store certificates as Cloudflare secrets:
 *    wrangler secret put PASS_CERTIFICATE   (PEM-encoded certificate)
 *    wrangler secret put PASS_PRIVATE_KEY    (PEM-encoded private key)
 *    wrangler secret put PASS_TYPE_ID        (e.g., pass.com.o5102o.card)
 *    wrangler secret put TEAM_ID             (Apple Developer Team ID)
 *
 * 5. Create pass icon images and store in KV or R2:
 *    - icon.png (29x29), icon@2x.png (58x58), icon@3x.png (87x87)
 *    - logo.png, logo@2x.png
 *    - strip.png (optional, for visual header)
 *
 * ══════════════════════════════════════════════════════════
 *
 * Alternative: Pre-generate a static .pkpass file
 *
 * If you prefer not to generate passes dynamically, you can:
 * 1. Use passkit-generator (npm) locally to create a .pkpass file
 * 2. Place the .pkpass file in your static assets
 * 3. Update the client to fetch it directly
 *
 * Example with passkit-generator:
 *   npm install passkit-generator
 *
 *   const { PKPass } = require('passkit-generator');
 *   const pass = new PKPass({}, {
 *     wwdr: fs.readFileSync('wwdr.pem'),
 *     signerCert: fs.readFileSync('signerCert.pem'),
 *     signerKey: fs.readFileSync('signerKey.pem'),
 *   });
 *   pass.type = 'generic';
 *   pass.primaryFields.push({ key: 'name', value: '이주영 (Jay)' });
 *   pass.secondaryFields.push({ key: 'title', value: 'Designer & Developer' });
 *   const buffer = pass.getAsBuffer();
 *
 * ══════════════════════════════════════════════════════════
 *
 * For Android users:
 * Android does not support .pkpass files. The client-side code
 * automatically detects Android and uses vCard (.vcf) instead,
 * which opens in the device's Contacts app.
 *
 * Google Wallet alternative:
 * Google Wallet Generic Passes can be created via Google Pay API.
 * Requires a Google Cloud project and Issuer account.
 * See: https://developers.google.com/wallet/generic
 *
 * Endpoint: GET /api/wallet
 * Response: application/vnd.apple.pkpass
 */

export async function onRequestGet(context) {
  const { env } = context;

  // Check if certificates are configured
  if (!env.PASS_CERTIFICATE || !env.PASS_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({
        error: 'Apple Wallet pass not configured',
        message: 'Apple Developer certificates are required. See function comments for setup instructions.',
        fallback: 'vcard',
      }),
      {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Pass definition (customize these fields)
  const passDefinition = {
    formatVersion: 1,
    passTypeIdentifier: env.PASS_TYPE_ID || 'pass.com.o5102o.card',
    serialNumber: 'o5102o-card-001',
    teamIdentifier: env.TEAM_ID || '',
    organizationName: 'o5102o',
    description: '이주영 (Jay) - Designer & Developer',
    foregroundColor: 'rgb(232, 232, 232)',
    backgroundColor: 'rgb(10, 10, 10)',
    labelColor: 'rgb(143, 143, 143)',
    generic: {
      primaryFields: [
        { key: 'name', label: '이름', value: '이주영 (Jay)' },
      ],
      secondaryFields: [
        { key: 'title', label: '직함', value: 'Designer & Developer' },
        { key: 'org', label: '학교', value: '컴퓨터공학부' },
      ],
      auxiliaryFields: [
        { key: 'email', label: 'Email', value: 'jyounglee1020@gmail.com' },
        { key: 'web', label: 'Web', value: 'o5102o.com' },
      ],
      backFields: [
        { key: 'github', label: 'GitHub', value: 'github.com/jaylee1020' },
        { key: 'instagram', label: 'Instagram', value: '@o5102o' },
        { key: 'portfolio', label: 'Portfolio', value: 'by.o5102o.com' },
      ],
    },
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: 'https://card.o5102o.com',
      messageEncoding: 'iso-8859-1',
    },
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: 'https://card.o5102o.com',
        messageEncoding: 'iso-8859-1',
      },
    ],
  };

  // TODO: Implement actual pass signing and packaging
  // This requires PKCS7/CMS signing which is complex in Workers.
  // Consider using a pre-generated .pkpass stored in R2/KV,
  // or an external service for pass generation.

  return new Response(
    JSON.stringify({
      error: 'Pass generation not yet implemented',
      passDefinition,
      message: 'Use passkit-generator locally to create the .pkpass file, then serve it from R2 or static assets.',
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
