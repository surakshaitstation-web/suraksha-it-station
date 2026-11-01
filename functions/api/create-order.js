const API_VERSION = "2025-01-01";
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = (value, max) => String(value || "").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!env.CASHFREE_CLIENT_ID || !env.CASHFREE_CLIENT_SECRET) {
    return json({ error: "Online payments are not configured yet. Please contact the website administrator." }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  const phone = clean(body.phone, 10);
  const service = clean(body.service, 100);
  const note = clean(body.note, 100);
  const amount = Number(body.amount);

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^[6-9]\d{9}$/.test(phone) || !service ||
      !Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return json({ error: "Please check your name, email, 10-digit mobile number, service and payment amount (₹1–₹1,00,000)." }, 400);
  }

  const mode = env.CASHFREE_ENV === "production" ? "production" : "sandbox";
  const base = mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  const orderId = "SIT_" + Date.now() + "_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const origin = new URL(request.url).origin;
  const payload = {
    order_id: orderId,
    order_amount: Math.round(amount * 100) / 100,
    order_currency: "INR",
    customer_details: {
      customer_id: "sit_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20),
      customer_name: name.replace(/[^A-Za-z .'-]/g, "").slice(0, 80) || "Customer",
      customer_email: email,
      customer_phone: phone
    },
    order_meta: {
      return_url: origin + "/?order_id={order_id}",
      notify_url: origin + "/api/webhook"
    },
    order_note: (service + (note ? " - " + note : "")).slice(0, 200)
  };

  try {
    const cf = await fetch(base + "/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": API_VERSION,
        "x-client-id": env.CASHFREE_CLIENT_ID,
        "x-client-secret": env.CASHFREE_CLIENT_SECRET,
        "x-idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify(payload)
    });
    const data = await cf.json();
    if (!cf.ok || !data.payment_session_id) {
      console.error("Cashfree create-order failure", cf.status, data.type || data.code || "unknown");
      return json({ error: "Cashfree could not create the payment session. Please try again or contact us." }, 502);
    }
    return json({ order_id: orderId, payment_session_id: data.payment_session_id, mode });
  } catch (error) {
    console.error("Cashfree connection error", error);
    return json({ error: "Payment service is temporarily unavailable. Please try again." }, 502);
  }
}
