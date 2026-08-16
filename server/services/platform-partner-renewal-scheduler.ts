import { diployLogger } from "@diploy/core";
import {
  processPlatformPartnerDunning,
  processPlatformPartnerRenewals,
} from "./platform-partner-billing.service";

let started = false;

export function startPlatformPartnerRenewalScheduler() {
  if (started) return;
  if (process.env.PLATFORM_BILLING_SCHEDULER_ENABLED === "false") {
    diployLogger.warn("[Platform Billing] Renewal scheduler disabled by env");
    return;
  }

  started = true;
  const intervalMs = Number(process.env.PLATFORM_BILLING_SCHEDULER_INTERVAL_MS || 60 * 60 * 1000);
  const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || undefined;

  const run = async () => {
    try {
      const renewals = await processPlatformPartnerRenewals({ baseUrl });
      const dunning = await processPlatformPartnerDunning({ baseUrl });
      if (renewals.checked || dunning.checked) {
        diployLogger.success(`[Platform Billing] renewals=${JSON.stringify(renewals)} dunning=${JSON.stringify(dunning)}`);
      }
    } catch (error) {
      diployLogger.error(`[Platform Billing] Renewal scheduler failed: ${error}`);
    }
  };

  const firstRun = setTimeout(run, 30_000);
  firstRun.unref?.();

  const timer = setInterval(run, intervalMs);
  timer.unref?.();

  diployLogger.success(`[Platform Billing] Renewal scheduler started every ${Math.round(intervalMs / 60000)} minute(s)`);
}
