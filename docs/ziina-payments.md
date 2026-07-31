# Ziina Payment Gateway

## Environment

Set backend-only variables. Do not use `VITE_` for Ziina secrets.

```
ZIINA_ENABLED=false
ZIINA_API_TOKEN=
ZIINA_API_BASE_URL=https://api-v2.ziina.com/api
ZIINA_WEBHOOK_SECRET=
ZIINA_SUCCESS_URL=https://your-domain.com/payment/ziina/success
ZIINA_CANCEL_URL=https://your-domain.com/payment/ziina/cancel
ZIINA_EMBEDDED_VERSION=v1
PUBLIC_APP_URL=https://your-domain.com
```

## Database

The startup migration adds Ziina metadata columns to `transactions`, creates `payment_webhook_events`, and seeds an inactive `ziina` provider.

Run your normal migration/start flow:

```
npm run db:push
npm run dev
```

## Webhook registration

After setting `PUBLIC_APP_URL`, `ZIINA_API_TOKEN`, and `ZIINA_WEBHOOK_SECRET`:

```
npm run ziina:webhook:register
```

The script calls `POST /webhook` and never prints secrets.

## Embedded checkout domain verification

For production embedded checkout, the approved production domain must serve Ziina's official Apple merchant domain verification file at:

```
/.well-known/apple-developer-merchantid-domain-association
```

Download the current official file from Ziina documentation/support and place it at:

```
public/.well-known/apple-developer-merchantid-domain-association
```

The Express route serves it as `text/plain` when present. Do not invent the file contents. The production domain must also be approved by Ziina before embedded checkout is used.

## Webhook signature

Ziina documents the webhook signature header as `X-Hmac-Signature`, containing a hex encoded HMAC-SHA256 of the raw request body using `ZIINA_WEBHOOK_SECRET`.
