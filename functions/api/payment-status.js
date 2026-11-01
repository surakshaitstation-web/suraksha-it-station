const API_VERSION = "2025-01-01";
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export async function onRequestGet({ request, env }) {
  if (!env.CASHFREE_CLIENT_ID || !env.CASHFREE_CLIENT_SECRET) return json({ error: "Payment verification is not configured." }, 503);
  const orderId = new URL(request.url).searchParams.get("order_id") || "";
  if (!/^SIT_[A-Za-z0-9_-]{8,80}$/.test(orderId)) return json({ error: "Invalid order reference." }, 400);
  const base = env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  try {
    const response = await fetch(base + "/orders/" + encodeURIComponent(orderId), {
      headers: {
        "x-api-version": API_VERSION,
        "x-client-id": env.CASHFREE_CLIENT_ID,
        "x-client-secret": env.CASHFREE_CLIENT_SECRET
      }
    });
    const data = await response.json();
    if (!response.ok) return json({ error: "Could not verify this payment reference." }, 502);
    return json({ order_id: data.order_id, order_status: data.order_status, order_amount: data.order_amount, order_currency: data.order_currency });
  } catch (error) {
    console.error("Cashfree status check failed", error);
    return json({ error: "Payment verification is temporarily unavailable." }, 502);
  }
}
