function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  if (!env.CASHFREE_CLIENT_SECRET) return new Response("Not configured", { status: 503 });
  const signature = request.headers.get("x-webhook-signature") || "";
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const rawBody = await request.text();
  if (!signature || !timestamp || !rawBody) return new Response("Bad request", { status: 400 });
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(env.CASHFREE_CLIENT_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + rawBody));
    const expected = toBase64(new Uint8Array(digest));
    const a = new TextEncoder().encode(expected);
    const b = new TextEncoder().encode(signature);
    if (a.length !== b.length) return new Response("Invalid signature", { status: 401 });
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
    if (mismatch !== 0) return new Response("Invalid signature", { status: 401 });
    // Cashfree's signed event is acknowledged. The customer-facing status is
    // independently confirmed against Cashfree's order API, never this payload.
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Cashfree webhook verification failed", error);
    return new Response("Webhook verification failed", { status: 400 });
  }
}
