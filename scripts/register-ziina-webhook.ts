import "dotenv/config";
import { registerWebhook } from "../server/services/payments/ziina.service";

async function main() {
  const publicUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  const secret = process.env.ZIINA_WEBHOOK_SECRET;

  if (!publicUrl) throw new Error("PUBLIC_APP_URL is required");
  if (!process.env.ZIINA_API_TOKEN) throw new Error("ZIINA_API_TOKEN is required");
  if (!secret) throw new Error("ZIINA_WEBHOOK_SECRET is required");

  const url = `${publicUrl}/api/webhooks/ziina`;
  await registerWebhook(url, secret);
  console.log(`Ziina webhook registered for ${url}`);
}

main().catch((error) => {
  console.error(`Unable to register Ziina webhook: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exit(1);
});
