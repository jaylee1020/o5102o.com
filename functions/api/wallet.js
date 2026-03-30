const JSON_HEADERS = Object.freeze({
  "Content-Type": "application/json",
});

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function hasPassConfiguration(env) {
  return Boolean(env.PASS_CERTIFICATE && env.PASS_PRIVATE_KEY);
}

export async function onRequestGet({ env }) {
  if (!hasPassConfiguration(env)) {
    return jsonResponse(
      {
        error: "Apple Wallet pass not configured",
        fallback: "vcard",
      },
      501
    );
  }

  return jsonResponse(
    {
      error: "Pass generation not yet implemented",
      fallback: "vcard",
    },
    501
  );
}
