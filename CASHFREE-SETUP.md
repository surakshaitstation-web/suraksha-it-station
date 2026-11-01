# Cashfree Payments — Suraksha IT Station

This site uses Cashfree hosted checkout with Cloudflare Pages Functions. The browser never receives the Cashfree client secret.

## 1. Configure Cloudflare Pages

In Cloudflare Dashboard, open **Workers & Pages → surakshitstation → Settings → Variables and Secrets**. Add these as **encrypted secrets**:

- `CASHFREE_CLIENT_ID`: your Cashfree App ID / Client ID
- `CASHFREE_CLIENT_SECRET`: your Cashfree secret key

Add this regular variable:

- `CASHFREE_ENV`: `sandbox` for testing, or `production` after Cashfree activates your live account and credentials.

Set the variables for the correct environment (Preview and Production as needed), then redeploy the Pages project.

## 2. Cashfree dashboard

In Cashfree merchant dashboard, enable/complete website verification and payment gateway activation. Configure the webhook URL:

`https://surakshitstation.pages.dev/api/webhook`

Subscribe to payment success and failure events as offered in your Cashfree dashboard. The webhook endpoint verifies Cashfree's HMAC signature. The website independently fetches the order status from Cashfree before showing a successful payment.

## 3. Test in sandbox

1. Set `CASHFREE_ENV=sandbox` and use sandbox App ID and secret.
2. Redeploy.
3. Make a small test payment using Cashfree's current sandbox test instruments.
4. Confirm the return page reports **Payment successful** only when Cashfree reports `PAID`.
5. Check the order in the Cashfree sandbox dashboard.

Do not test with real customer funds while in sandbox.

## 4. Go live

After Cashfree approves the merchant account and provides live credentials, replace the two secrets with live values, set `CASHFREE_ENV=production`, and redeploy. Confirm a low-value live transaction and refund it if appropriate.

## Routes

- `POST /api/create-order`: validates customer details and amount, then creates a Cashfree order.
- `GET /api/payment-status?order_id=...`: fetches authoritative order status from Cashfree.
- `POST /api/webhook`: validates the webhook signature and acknowledges the event.

The checkout form permits payments from ₹1 to ₹1,00,000 for an agreed service/invoice. Adjust the server-side cap in `functions/api/create-order.js` if your approved business use case needs a different limit. The amount is supplied by the payer; reconcile it against your quotation/invoice before delivering paid services.
