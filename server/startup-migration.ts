/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 *
 * Idempotent startup migration — runs on every server boot.
 * Uses raw SQL with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards
 * so it is always safe to re-run and never breaks a fresh install.
 *
 * Background: the project uses `db:push` for schema changes, which
 * means any client that did not run `db:push` after an update will
 * have a stale database.  This file self-heals those databases.
 */

import type { Pool, PoolClient } from "pg";
import { precheckCleanupSteps } from "./db-precheck-cleanup";
import { PROVIDER_CURRENCY_OPTIONS } from "@shared/payment-currencies";

interface MigrationStep {
  description: string;
  sql: string;
  /**
   * When true, the row count returned by the SQL is logged at INFO level
   * (only when > 0). Useful for one-shot data backfills so operators can
   * see how many legacy rows were repaired during an upgrade.
   */
  logRowCount?: boolean;
}

function addColumnIfNotExists(
  table: string,
  column: string,
  definition: string
): MigrationStep {
  return {
    description: `Add ${table}.${column}`,
    sql: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition};`,
  };
}

const steps: MigrationStep[] = [
// ────────────────────────────────────────────────────
  // Data cleanup — must run BEFORE any unique-index / FK
  // step further down so they can succeed on legacy data.
  //
  // Shared with the in-app updater precheck step
  // (see server/db-precheck-cleanup.ts) so the two paths can
  // never drift apart.
// ────────────────────────────────────────────────────
  ...precheckCleanupSteps,
// ────────────────────────────────────────────────────
  // campaigns
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "campaigns",
    "population_started_at",
    "TIMESTAMP"
  ),
// ────────────────────────────────────────────────────
  // automation_edges
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "automation_edges",
    "source_handle",
    "VARCHAR"
  ),
  {
    description: "Recreate automation_edges unique constraint to include source_handle",
    sql: `
      ALTER TABLE automation_edges DROP CONSTRAINT IF EXISTS automation_edges_unique_idx;
      CREATE UNIQUE INDEX IF NOT EXISTS automation_edges_unique_handle_idx
        ON automation_edges (automation_id, source_node_id, target_node_id, COALESCE(source_handle, ''));
    `,
  },
// ────────────────────────────────────────────────────
  // automation_executions
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "automation_executions",
    "trigger_message_id",
    "VARCHAR(200)"
  ),
  {
    description: "Create automation_executions_message_unique_idx",
    sql: `
      CREATE UNIQUE INDEX IF NOT EXISTS automation_executions_message_unique_idx
        ON automation_executions (automation_id, conversation_id, trigger_message_id);
    `,
  },
// ────────────────────────────────────────────────────
  // channels
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "channels",
    "is_coexistence",
    "BOOLEAN DEFAULT false"
  ),
  addColumnIfNotExists(
    "channels",
    "health_status",
    "TEXT DEFAULT 'unknown'"
  ),
  addColumnIfNotExists("channels", "last_health_check", "TIMESTAMP"),
  addColumnIfNotExists(
    "channels",
    "health_details",
    "JSONB DEFAULT '{}'"
  ),
  addColumnIfNotExists(
    "channels",
    "connection_method",
    "VARCHAR(20) DEFAULT 'embedded'"
  ),
// ────────────────────────────────────────────────────
  // conversations
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "conversations",
    "last_incoming_message_at",
    "TIMESTAMP"
  ),
  addColumnIfNotExists("conversations", "last_message_text", "TEXT"),
  addColumnIfNotExists("conversations", "chatbot_id", "VARCHAR"),
  addColumnIfNotExists("conversations", "session_id", "TEXT"),
  addColumnIfNotExists(
    "conversations",
    "unread_count",
    "INTEGER DEFAULT 0"
  ),
// ────────────────────────────────────────────────────
  // messages
// ────────────────────────────────────────────────────
  addColumnIfNotExists("messages", "error_details", "JSONB"),
  addColumnIfNotExists("messages", "media_sha256", "VARCHAR(128)"),
  addColumnIfNotExists("messages", "delivered_at", "TIMESTAMP"),
  addColumnIfNotExists("messages", "read_at", "TIMESTAMP"),
  addColumnIfNotExists("messages", "error_code", "VARCHAR(50)"),
  addColumnIfNotExists("messages", "error_message", "TEXT"),
  addColumnIfNotExists("messages", "campaign_id", "VARCHAR"),
// ────────────────────────────────────────────────────
  // users
// ────────────────────────────────────────────────────
  addColumnIfNotExists("users", "fcm_token", "VARCHAR(512)"),
  addColumnIfNotExists(
    "users",
    "is_email_verified",
    "BOOLEAN DEFAULT false"
  ),
  addColumnIfNotExists("users", "stripe_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "razorpay_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "paypal_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "paystack_customer_code", "VARCHAR"),
  addColumnIfNotExists("users", "mercadopago_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "public_client_id", "INTEGER"),
  {
    description: "Backfill public client IDs from 4298",
    sql: `
      WITH base AS (
        SELECT GREATEST(4297, COALESCE(MAX(public_client_id), 4297)) AS current_max
        FROM users
      ),
      numbered AS (
        SELECT u.id, base.current_max + ROW_NUMBER() OVER (ORDER BY u.created_at NULLS LAST, u.id)::int AS next_public_client_id
        FROM users u
        CROSS JOIN base
        WHERE u.role = 'admin' AND u.public_client_id IS NULL
      )
      UPDATE users u
      SET public_client_id = numbered.next_public_client_id
      FROM numbered
      WHERE u.id = numbered.id;
    `,
    logRowCount: true,
  },
  {
    description: "Create unique public client ID index",
    sql: `
      CREATE UNIQUE INDEX IF NOT EXISTS users_public_client_id_idx
        ON users (public_client_id)
        WHERE public_client_id IS NOT NULL;
    `,
  },
// ────────────────────────────────────────────────────
  // plans
// ────────────────────────────────────────────────────
  addColumnIfNotExists("plans", "stripe_product_id", "VARCHAR"),
  addColumnIfNotExists("plans", "stripe_price_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "stripe_price_id_annual", "VARCHAR"),
  addColumnIfNotExists("plans", "razorpay_plan_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "razorpay_plan_id_annual", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_product_id", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_plan_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_plan_id_annual", "VARCHAR"),
  addColumnIfNotExists(
    "plans",
    "paystack_plan_code_monthly",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "paystack_plan_code_annual",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "mercadopago_plan_id_monthly",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "mercadopago_plan_id_annual",
    "VARCHAR"
  ),
// ────────────────────────────────────────────────────
  // subscriptions
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "subscriptions",
    "gateway_subscription_id",
    "VARCHAR"
  ),
  addColumnIfNotExists("subscriptions", "gateway_provider", "VARCHAR"),
  addColumnIfNotExists("subscriptions", "gateway_status", "VARCHAR"),

  // Stripe checkout writes these columns immediately after creating a
  // gateway subscription. Older installs may not have them yet, which causes
  // checkout to fail after Stripe has already created the subscription.
  addColumnIfNotExists("transactions", "provider_subscription_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_payment_intent_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_setup_intent_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_invoice_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_customer_id", "VARCHAR"),
// ────────────────────────────────────────────────────
  // message_queue
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "message_queue",
    "template_language",
    "VARCHAR(20) DEFAULT 'en_US'"
  ),
  addColumnIfNotExists("message_queue", "sent_via", "VARCHAR(20)"),
  addColumnIfNotExists("message_queue", "cost", "VARCHAR(20)"),
  addColumnIfNotExists("message_queue", "delivered_at", "TIMESTAMP"),
  addColumnIfNotExists("message_queue", "read_at", "TIMESTAMP"),
// ────────────────────────────────────────────────────
  // ai_settings
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "ai_settings",
    "words",
    "TEXT[] DEFAULT ARRAY[]::text[]"
  ),
  // Diagnostic columns: webhook handler writes the reason any time it
  // skips an AI auto-reply, so support can answer "why isn't my bot
  // replying?" from the diagnostics endpoint without DB access.
  addColumnIfNotExists("ai_settings", "last_skip_reason", "TEXT"),
  addColumnIfNotExists(
    "ai_settings",
    "last_skip_at",
    "TIMESTAMP WITH TIME ZONE"
  ),
// ────────────────────────────────────────────────────
  // templates
// ────────────────────────────────────────────────────
  addColumnIfNotExists("templates", "rejection_reason", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "media_type",
    "TEXT DEFAULT 'text'"
  ),
  addColumnIfNotExists("templates", "media_url", "TEXT"),
  addColumnIfNotExists("templates", "media_handle", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "carousel_cards",
    "JSONB DEFAULT '[]'"
  ),
  addColumnIfNotExists("templates", "whatsapp_template_id", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "usage_count",
    "INTEGER DEFAULT 0"
  ),
  addColumnIfNotExists("templates", "header_type", "TEXT"),
  addColumnIfNotExists("templates", "body_variables", "INTEGER"),
// ────────────────────────────────────────────────────
  // campaigns
// ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "campaigns",
    "replied_count",
    "INTEGER DEFAULT 0"
  ),
// ────────────────────────────────────────────────────
  // contacts — multi-tenant scoping column + index + backfill
// ────────────────────────────────────────────────────
  addColumnIfNotExists("contacts", "tenant_id", "VARCHAR"),
  {
    description: "Create contacts_tenant_idx on contacts(tenant_id)",
    sql: `CREATE INDEX IF NOT EXISTS contacts_tenant_idx ON contacts(tenant_id);`,
  },
  {
    description:
      "Backfill contacts.tenant_id from creator (team users -> their parent, otherwise self)",
    sql: `
      UPDATE contacts c
         SET tenant_id = COALESCE(
           NULLIF(u.created_by, ''),
           u.id
         )
        FROM users u
       WHERE c.tenant_id IS NULL
         AND c.created_by IS NOT NULL
         AND c.created_by = u.id;
    `,
  },
// ────────────────────────────────────────────────────
  // webhook_dedup — shared dedup store used when Redis is unavailable.
  // Replaces the previous in-process Map fallback so dedup remains
  // consistent across multiple server instances.
// ────────────────────────────────────────────────────
  {
    description: "Create webhook_dedup (if not exists) for cross-instance fallback",
    sql: `
      CREATE TABLE IF NOT EXISTS webhook_dedup (
        wamid       VARCHAR(255) PRIMARY KEY,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS webhook_dedup_created_at_idx
        ON webhook_dedup (created_at);
    `,
  },
// ────────────────────────────────────────────────────
  // New tables — CREATE TABLE IF NOT EXISTS guards
// ────────────────────────────────────────────────────
  {
    description: "Create table channel_signup_logs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS channel_signup_logs (
        id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       VARCHAR NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'incomplete',
        step          VARCHAR(50) NOT NULL DEFAULT 'token_exchange',
        error_message TEXT,
        error_details JSONB,
        phone_number  TEXT,
        waba_id       TEXT,
        channel_id    VARCHAR,
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table client_api_keys (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_api_keys (
        id                    VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               VARCHAR NOT NULL,
        channel_id            VARCHAR,
        name                  VARCHAR(100) NOT NULL,
        api_key               VARCHAR(64) NOT NULL UNIQUE,
        secret_hash           VARCHAR(256) NOT NULL,
        permissions           JSONB DEFAULT '[]',
        is_active             BOOLEAN DEFAULT true,
        last_used_at          TIMESTAMP,
        request_count         INTEGER DEFAULT 0,
        monthly_request_count INTEGER DEFAULT 0,
        monthly_reset_at      TIMESTAMP,
        created_at            TIMESTAMP DEFAULT NOW(),
        revoked_at            TIMESTAMP
      );
    `,
  },
  {
    description: "Create table client_api_usage_logs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_api_usage_logs (
        id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id    VARCHAR NOT NULL,
        user_id       VARCHAR NOT NULL,
        channel_id    VARCHAR,
        endpoint      VARCHAR(255) NOT NULL,
        method        VARCHAR(10) NOT NULL,
        status_code   INTEGER,
        response_time INTEGER,
        ip_address    VARCHAR(45),
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table client_webhooks (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_webhooks (
        id                 VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            VARCHAR NOT NULL,
        channel_id         VARCHAR,
        url                TEXT NOT NULL,
        secret             VARCHAR(256),
        events             JSONB DEFAULT '[]',
        is_active          BOOLEAN DEFAULT true,
        last_triggered_at  TIMESTAMP,
        failure_count      INTEGER DEFAULT 0,
        created_at         TIMESTAMP DEFAULT NOW(),
        updated_at         TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table platform_languages (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS platform_languages (
        id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        code         VARCHAR(10) NOT NULL UNIQUE,
        name         VARCHAR(100) NOT NULL,
        native_name  VARCHAR(100) NOT NULL,
        icon         VARCHAR(10),
        direction    VARCHAR(3) NOT NULL DEFAULT 'ltr',
        is_enabled   BOOLEAN NOT NULL DEFAULT true,
        is_default   BOOLEAN NOT NULL DEFAULT false,
        translations JSONB DEFAULT '{}',
        sort_order   INTEGER DEFAULT 0,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Repair English platform_languages row if seeded with placeholder values",
    sql: `
      UPDATE platform_languages
      SET name = 'English',
          native_name = 'English',
          icon = '🇺🇸',
          direction = 'ltr'
      WHERE code = 'en'
        AND (name = 'en' OR native_name = 'en' OR icon = 'en' OR icon IS NULL OR icon = '');
    `,
  },
  {
    description: "Remove stray sample platform_languages row",
    sql: `
      DELETE FROM platform_languages WHERE code = 'sample';
    `,
  },
  {
    description: "Create table update_runs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS update_runs (
        id                     VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        triggered_by           VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        triggered_by_username  TEXT,
        from_version           TEXT,
        to_version             TEXT,
        status                 VARCHAR(20) NOT NULL DEFAULT 'running',
        final_message          TEXT,
        started_at             TIMESTAMP NOT NULL DEFAULT NOW(),
        finished_at            TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS update_runs_started_at_idx
        ON update_runs (started_at);
    `,
  },
  {
    description: "Create table update_run_events (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS update_run_events (
        id          SERIAL PRIMARY KEY,
        run_id      VARCHAR NOT NULL REFERENCES update_runs(id) ON DELETE CASCADE,
        step        VARCHAR(50) NOT NULL,
        status      VARCHAR(20) NOT NULL,
        message     TEXT NOT NULL,
        progress    INTEGER,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS update_run_events_run_id_idx
        ON update_run_events (run_id, id);
    `,
  },
// ────────────────────────────────────────────────────
  // panel_config — public_origin column captured from real HTTP traffic
  // (used to build absolute URLs in notification emails). Auto-detected,
  // never hardcoded. See server/services/public-origin.ts.
// ────────────────────────────────────────────────────
  addColumnIfNotExists("panel_config", "public_origin", "TEXT"),
// ────────────────────────────────────────────────────
  // payment_providers — backfill empty supported_currencies
  // for legacy rows that were saved by an older version of
  // Gateway Settings which always shipped `supportedCurrencies: []`.
  // Only fills rows that are currently empty/null; never overwrites
  // a list the operator has explicitly chosen.
// ────────────────────────────────────────────────────
  ...Object.entries(PROVIDER_CURRENCY_OPTIONS).map(([key, currencies]) => ({
    description: `Backfill payment_providers.supported_currencies for ${key} (when empty)`,
    sql: `
      UPDATE payment_providers
         SET supported_currencies = '${JSON.stringify(currencies)}'::jsonb
       WHERE provider_key = '${key}'
         AND (
           supported_currencies IS NULL
           OR jsonb_typeof(supported_currencies) <> 'array'
           OR jsonb_array_length(supported_currencies) = 0
         );
    `,
  })),
// ────────────────────────────────────────────────────
  // payment_providers — backfill missing config.isLive flag
  // for legacy rows created before the Live/Test toggle existed.
  //
  // Webhook signature verification now branches strictly on
  // config.isLive, so any row that has live API credentials but
  // no isLive field would silently be treated as Test mode after
  // upgrade and reject Live webhook events. Mark those rows as
  // Live so existing Live deployments keep working untouched.
  //
  // Idempotent: only runs on rows where the key is absent. New
  // rows always get the flag from the admin form.
// ────────────────────────────────────────────────────
  {
    description:
      "Backfill payment_providers.config.isLive=true for legacy rows with live API credentials",
    logRowCount: true,
    sql: `
      UPDATE payment_providers
         SET config = COALESCE(config, '{}'::jsonb)
                      || jsonb_build_object('isLive', true)
       WHERE config IS NOT NULL
         AND NOT (config ? 'isLive')
         AND (
           COALESCE(NULLIF(config->>'apiKey', ''), '') <> ''
           OR COALESCE(NULLIF(config->>'apiSecret', ''), '') <> ''
         );
    `,
  },

  {
    description:
      "Create table whatsapp_business_accounts_config (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS whatsapp_business_accounts_config (
        id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id     TEXT NOT NULL,
        app_secret TEXT NOT NULL,
        config_id  TEXT NOT NULL,
        created_by VARCHAR DEFAULT '',
        is_active  BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,
  },
// ────────────────────────────────────────────────────
  // Convert every legacy `TIMESTAMP WITHOUT TIME ZONE` column in the
  // public schema to `TIMESTAMPTZ`, interpreting the existing wall-clock
  // value as UTC (the server has always run in UTC).
  //
  // This fixes the dashboard-time-drift bug where rows stored as naive
  // timestamps were sent to the browser without an offset, causing
  // `new Date(...)` to interpret them in the browser's local timezone.
  //
  // Idempotent: once a column is already `timestamp with time zone` it
  // is excluded from the loop. The session.expire column is excluded
  // because it is owned by `connect-pg-simple`, which expects
  // `TIMESTAMP(6) WITHOUT TIME ZONE`.
// ────────────────────────────────────────────────────
  {
    description: "Add Ziina payment metadata columns to transactions",
    sql: `
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS workspace_id VARCHAR,
        ADD COLUMN IF NOT EXISTS purpose VARCHAR(80),
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
        ADD COLUMN IF NOT EXISTS checkout_url TEXT,
        ADD COLUMN IF NOT EXISTS embedded_url TEXT,
        ADD COLUMN IF NOT EXISTS provider_payload JSONB,
        ADD COLUMN IF NOT EXISTS failure_code VARCHAR(120),
        ADD COLUMN IF NOT EXISTS failure_message TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_unique
        ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS transactions_provider_payment_intent_unique
        ON transactions(payment_provider_id, provider_payment_intent_id) WHERE provider_payment_intent_id IS NOT NULL;
    `,
  },

  {
    description: "Create payment webhook events table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR NOT NULL,
        provider_event_id VARCHAR,
        provider_payment_id VARCHAR,
        payload_hash VARCHAR NOT NULL,
        sanitized_payload JSONB DEFAULT '{}'::jsonb,
        processing_status VARCHAR NOT NULL DEFAULT 'processed',
        processed_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS payment_webhook_events_provider_payment_idx
        ON payment_webhook_events(provider, provider_payment_id);
      CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_hash_unique
        ON payment_webhook_events(provider, payload_hash);
    `,
  },

  {
    description: "Seed Ziina payment provider (inactive by default)",
    sql: `
      INSERT INTO payment_providers (name, provider_key, description, logo, is_active, config, supported_currencies, supported_methods)
      VALUES (
        'Ziina',
        'ziina',
        'Accept embedded checkout payments with Ziina',
        'ziina',
        false,
        '{}'::jsonb,
        '["AED","USD","INR"]'::jsonb,
        '["card","apple_pay","google_pay"]'::jsonb
      )
      ON CONFLICT (provider_key) DO NOTHING;
    `,
  },
  {
    description: "Add white-label workspace metadata columns to channels",
    sql: `
      ALTER TABLE channels
        ADD COLUMN IF NOT EXISTS white_label_client_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS white_label_workspace_type VARCHAR(20) DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS white_label_points NUMERIC(14,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS white_label_auto_renew BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS white_label_end_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS white_label_notes TEXT;
    `,
  },
  {
    description: "Backfill white-label owner on legacy client channels",
    sql: `
      UPDATE channels c
      SET white_label_client_id = c.created_by
      FROM users u
      WHERE c.white_label_client_id IS NULL
        AND c.created_by = u.id
        AND u.role = 'admin';
    `,
    logRowCount: true,
  },
  {
    description: "Create default workspace for existing clients without one",
    sql: `
      INSERT INTO channels (
        name,
        phone_number_id,
        access_token,
        phone_number,
        whatsapp_business_account_id,
        app_id,
        is_active,
        health_status,
        health_details,
        connection_method,
        created_by,
        white_label_client_id,
        white_label_workspace_type,
        white_label_points,
        white_label_auto_renew
      )
      SELECT
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username, split_part(u.email, '@', 1), 'Client') || ' Workspace',
        'workspace-' || u.id,
        '',
        NULL,
        NULL,
        NULL,
        true,
        'unknown',
        '{"workspaceOnly":true}'::jsonb,
        'workspace',
        u.id,
        u.id,
        'free',
        0,
        false
      FROM users u
      WHERE u.role = 'admin'
        AND NOT EXISTS (
          SELECT 1
          FROM channels c
          WHERE COALESCE(c.white_label_client_id, NULLIF(c.created_by,'')) = u.id
        );
    `,
    logRowCount: true,
  },

  {
    description: "Create white-label settings table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        singleton_key VARCHAR(40) NOT NULL UNIQUE DEFAULT 'default',
        platform_name TEXT NOT NULL DEFAULT 'Whatsway',
        brand_tagline TEXT,
        support_email TEXT,
        support_phone TEXT,
        primary_color VARCHAR(20) DEFAULT '#16a34a',
        secondary_color VARCHAR(20) DEFAULT '#111827',
        accent_color VARCHAR(20) DEFAULT '#22c55e',
        main_logo TEXT,
        dark_mode_logo TEXT,
        favicon TEXT,
        login_banner TEXT,
        footer_text TEXT,
        custom_domain TEXT,
        email_from_name TEXT,
        email_from_address TEXT,
        hide_powered_by BOOLEAN DEFAULT false,
        allow_partner_signup BOOLEAN DEFAULT false,
        maintenance_mode BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}'::jsonb,
        updated_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },

  {
    description: "Create white-label partners table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_partners (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company_name TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        commission_rate NUMERIC(6,2) DEFAULT 0,
        revenue_share_rate NUMERIC(6,2) DEFAULT 0,
        payout_method VARCHAR(40),
        payout_details JSONB DEFAULT '{}'::jsonb,
        notes TEXT,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },

  {
    description: "Create white-label partner clients table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_partner_clients (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id VARCHAR NOT NULL REFERENCES white_label_partners(id) ON DELETE CASCADE,
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT white_label_partner_clients_unique UNIQUE (partner_id, client_id)
      );
    `,
  },

  {
    description: "Create white-label workspace add-ons table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_workspace_addons (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        addon_key VARCHAR(80) NOT NULL,
        addon_name TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        price NUMERIC(10,2) DEFAULT 0,
        starts_at TIMESTAMPTZ DEFAULT NOW(),
        ends_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS white_label_workspace_addons_workspace_idx ON white_label_workspace_addons(workspace_id);
    `,
  },

  {
    description: "Create white-label plan configs table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_plan_configs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_key VARCHAR(80) NOT NULL UNIQUE,
        plan_name TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        display_price NUMERIC(10,2) DEFAULT 0,
        cost_price NUMERIC(10,2) DEFAULT 0,
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        badge VARCHAR(80),
        description TEXT,
        hide_usage_counts BOOLEAN DEFAULT false,
        enabled_features JSONB DEFAULT '[]'::jsonb,
        disabled_features JSONB DEFAULT '[]'::jsonb,
        gateway_metadata JSONB DEFAULT '{}'::jsonb,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },

  {
    description: "Seed default white-label plan configs",
    sql: `
      INSERT INTO white_label_plan_configs (plan_key, plan_name, status, display_price, cost_price, billing_cycle, badge, enabled_features, disabled_features)
      VALUES
        ('waba_demo', 'WABA DEMO', 'active', 0, 0, 'monthly', 'Demo',
          '["whatsapp_cloud","live_chat","contacts","templates","campaigns","analytics","api_keys"]'::jsonb,
          '["automations","chatbot_flow","ai_assistant","ai_calling","team_inbox","groups","webhooks","google_sheets","email_marketing","multi_workspace","team_members","broadcast_scheduling","template_sync","conversation_assignment","labels_tags"]'::jsonb),
        ('activated', 'Activated', 'active', 8500, 10, 'monthly', 'Active',
          '["whatsapp_cloud","live_chat","contacts","templates","campaigns","analytics","automations","team_inbox","groups","api_keys","webhooks"]'::jsonb,
          '["chatbot_flow","ai_assistant","ai_calling","google_sheets","email_marketing","multi_workspace","team_members","broadcast_scheduling","template_sync","conversation_assignment","labels_tags"]'::jsonb),
        ('waba_business', 'WABA Business Plan', 'active', 15000, 25, 'monthly', 'Business',
          '["whatsapp_cloud","live_chat","contacts","templates","campaigns","analytics","automations","chatbot_flow","ai_assistant","team_inbox","groups","api_keys","webhooks","google_sheets","multi_workspace","team_members","broadcast_scheduling","template_sync","conversation_assignment","labels_tags"]'::jsonb,
          '["ai_calling","email_marketing"]'::jsonb),
        ('waba_individual', 'WABA Individual Plan', 'active', 3500, 5, 'monthly', 'Individual',
          '["whatsapp_cloud","live_chat","contacts","templates","campaigns","analytics"]'::jsonb,
          '["automations","chatbot_flow","ai_assistant","ai_calling","team_inbox","groups","api_keys","webhooks","google_sheets","email_marketing","multi_workspace","team_members","broadcast_scheduling","template_sync","conversation_assignment","labels_tags"]'::jsonb)
      ON CONFLICT (plan_key) DO NOTHING;
    `,
  },

  {
    description: "Create white-label addon catalog table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_addon_catalog (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        addon_key VARCHAR(80) NOT NULL UNIQUE,
        addon_name TEXT NOT NULL,
        description TEXT,
        cost_price NUMERIC(10,2) DEFAULT 0,
        points NUMERIC(10,2) DEFAULT 0,
        label TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        display_order INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },

  {
    description: "Seed default white-label addon catalog",
    sql: `
      INSERT INTO white_label_addon_catalog (addon_key, addon_name, description, cost_price, points, label, status, display_order)
      VALUES
        ('bot', 'Extra bot', 'Extra 1 bot, $5/month', 5, 30, 'Extra 1 bot, 30 points/month', 'active', 10),
        ('member', 'Extra member', 'Extra 1 member, $5/month', 5, 25, 'Extra 1 member, 25 points/month', 'active', 20),
        ('bot_user', 'Extra bot users', 'Extra 1,000 bot users, $5/month', 5, 10, 'Extra 1,000 bot users, 10 points/month', 'active', 30),
        ('bot_user_large', 'Extra large bot users', 'Extra 10,000 bot users, $30/month', 30, 99, 'Extra 10,000 bot users, 99 points/month', 'active', 40),
        ('inbound_webhook', 'Inbound webhook', 'Inbound Webhook - per 1,000 requests, $20/month', 20, 20, 'Inbound Webhook - per 1,000 requests, 20 points/month', 'inactive', 50),
        ('timeout', 'External request timeout', 'OpenAI/External Request Timeout - per 10 seconds, $10/month', 10, 20, 'OpenAI/External Request Timeout - per 10 seconds, 20 points/month', 'inactive', 60),
        ('lists', 'Tickets/Lists', 'Tickets/Lists, $10/month', 10, 10, 'Tickets/Lists, 10 points/month', 'inactive', 70),
        ('fb_wa_calls', 'WhatsApp/Messenger Calls', 'WhatsApp/Messenger Calls - per 500 calls, $10/month', 10, 10, 'WhatsApp/Messenger Calls - per 500 calls, 10 points/month', 'active', 80),
        ('chat_msg_retention', 'Chat message retention', 'Chat Message Retention (3 years), $50/month', 50, 50, 'Chat Message Retention (3 years), 50 points/month', 'active', 90),
        ('node', 'Extra nodes', 'Extra Nodes - per 1,000 nodes per bot, $20/month', 20, 20, 'Extra Nodes - per 1,000 nodes per bot, 20 points/month', 'active', 100),
        ('custom_api', 'API rate limit', 'API Rate Limit - per 1,000 extra requests/hour per bot, $50/month', 50, 50, 'API Rate Limit - per 1,000 extra requests/hour per bot, 50 points/month', 'active', 110)
      ON CONFLICT (addon_key) DO NOTHING;
    `,
  },

  {
    description: "Create white-label topup options table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_topup_options (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        display_order INTEGER DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        points NUMERIC(14,2) NOT NULL DEFAULT 0,
        label TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },

  {
    description: "Seed default white-label topup options",
    sql: `
      INSERT INTO white_label_topup_options (display_order, currency, amount, points, label, status)
      SELECT * FROM (VALUES
        (10, 'USD', 1000::numeric, 1000::numeric, 'Credits $1000', 'active'),
        (20, 'USD', 1500::numeric, 1500::numeric, 'Credits $1500', 'active'),
        (30, 'USD', 3500::numeric, 3500::numeric, 'Credits $3500', 'active'),
        (40, 'USD', 5000::numeric, 5000::numeric, 'Credits $5000', 'active'),
        (50, 'USD', 10000::numeric, 10000::numeric, 'Credits $10000', 'active'),
        (60, 'USD', 20000::numeric, 20000::numeric, 'Credits $20000', 'active')
      ) AS seed(display_order, currency, amount, points, label, status)
      WHERE NOT EXISTS (SELECT 1 FROM white_label_topup_options);
    `,
  },

  {
    description: "Create white-label topup payments table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_topup_payments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id VARCHAR REFERENCES channels(id) ON DELETE SET NULL,
        topup_option_id VARCHAR REFERENCES white_label_topup_options(id) ON DELETE SET NULL,
        provider VARCHAR(40) NOT NULL DEFAULT 'stripe',
        provider_session_id VARCHAR(255),
        provider_payment_intent_id VARCHAR(255),
        amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        points NUMERIC(14,2) NOT NULL,
        label TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        checkout_url TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        credited_at TIMESTAMPTZ,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS white_label_topup_payments_client_idx ON white_label_topup_payments(client_id);
      CREATE UNIQUE INDEX IF NOT EXISTS white_label_topup_payments_provider_session_idx
        ON white_label_topup_payments(provider, provider_session_id)
        WHERE provider_session_id IS NOT NULL;
    `,
  },

  {
    description: "Create white-label credit transactions table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_credit_transactions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id VARCHAR REFERENCES channels(id) ON DELETE SET NULL,
        transaction_type VARCHAR(20) NOT NULL,
        credits NUMERIC(14,2) NOT NULL,
        balance_before NUMERIC(14,2) NOT NULL DEFAULT 0,
        balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
        reference TEXT,
        note TEXT,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS white_label_credit_transactions_client_idx ON white_label_credit_transactions(client_id);
      CREATE INDEX IF NOT EXISTS white_label_credit_transactions_workspace_idx ON white_label_credit_transactions(workspace_id);
    `,
  },

  {
    description: "Create white-label audit logs table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS white_label_audit_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(80) NOT NULL,
        target_type VARCHAR(80) NOT NULL,
        target_id VARCHAR,
        previous_values JSONB,
        updated_values JSONB,
        ip_address VARCHAR(80),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS white_label_audit_logs_target_idx ON white_label_audit_logs(target_type, target_id);
      CREATE INDEX IF NOT EXISTS white_label_audit_logs_actor_idx ON white_label_audit_logs(actor_id);
    `,
  },

  {
    description: "Create marketing CMS logos table (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS marketing_cms_logos (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(160) NOT NULL,
        logo_url TEXT NOT NULL,
        placement VARCHAR(80) NOT NULL DEFAULT 'founders',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        display_order INTEGER DEFAULT 0,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS marketing_cms_logos_placement_idx ON marketing_cms_logos(placement);
    `,
  },

  {
    description: "Seed default marketing CMS founder logos",
    sql: `
      INSERT INTO marketing_cms_logos (name, logo_url, placement, status, display_order)
      SELECT * FROM (VALUES
        ('Lenskart', 'https://logo.clearbit.com/lenskart.com', 'founders', 'active', 10),
        ('Quikr', 'https://logo.clearbit.com/quikr.com', 'founders', 'active', 20),
        ('The Man Co', 'https://logo.clearbit.com/themancompany.com', 'founders', 'active', 30),
        ('HDFC', 'https://logo.clearbit.com/hdfcbank.com', 'founders', 'active', 40),
        ('Reliance', 'https://logo.clearbit.com/relianceindustries.com', 'founders', 'active', 50),
        ('Edelweiss', 'https://logo.clearbit.com/edelweissfin.com', 'founders', 'active', 60),
        ('Apollo', 'https://logo.clearbit.com/apollohospitals.com', 'founders', 'active', 70)
      ) AS seed(name, logo_url, placement, status, display_order)
      WHERE NOT EXISTS (SELECT 1 FROM marketing_cms_logos WHERE placement='founders');
    `,
  },

  {
    description: "Create marketing CMS settings and entries tables (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS marketing_cms_settings (
        key VARCHAR(120) PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_cms_entries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(80) NOT NULL,
        title VARCHAR(220) NOT NULL,
        subtitle VARCHAR(220),
        body TEXT,
        image_url TEXT,
        link_url TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        display_order INTEGER DEFAULT 0,
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS marketing_cms_entries_type_idx ON marketing_cms_entries(type);
    `,
  },

  {
    description: "Seed default marketing CMS settings",
    sql: `
      INSERT INTO marketing_cms_settings (key, value)
      VALUES
        ('announcement_bar', '{"enabled":true,"badge":"NEW LAUNCH","text":"Build AI Agents on WhatsApp that qualify leads, answer customers, and convert sales 24/7","ctaText":"Explore More","ctaUrl":"/ai-assistant"}'::jsonb),
        ('social_links', '{"twitter":"https://x.com","linkedin":"https://linkedin.com","instagram":"https://instagram.com","facebook":"https://facebook.com"}'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `,
  },

  {
    description:
      "Convert all naive timestamp columns to timestamptz (interpret existing values as UTC)",
    sql: `
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND data_type = 'timestamp without time zone'
            AND NOT (table_name = 'session' AND column_name = 'expire')
        LOOP
          EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',
            r.table_name, r.column_name, r.column_name
          );
        END LOOP;
      END$$;
    `,
  },
];

/**
 * Query existing columns across all tables we intend to alter so we can
 * report what was actually added vs already present.
 */
async function getExistingColumns(
  client: PoolClient
): Promise<Set<string>> {
  const { rows } = await client.query<{ key: string }>(`
    SELECT table_name || '.' || column_name AS key
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  return new Set(rows.map((r) => r.key));
}

async function getExistingTables(
  client: PoolClient
): Promise<Set<string>> {
  const { rows } = await client.query<{ table_name: string }>(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return new Set(rows.map((r) => r.table_name));
}

export async function runStartupMigration(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const beforeColumns = await getExistingColumns(client);
    const beforeTables = await getExistingTables(client);

    const errors: string[] = [];

    for (const step of steps) {
      try {
        const result = await client.query(step.sql);
        if (step.logRowCount && result.rowCount && result.rowCount > 0) {
          console.log(
            `[startup-migration] ${step.description} — patched ${result.rowCount} row(s).`
          );
        }
      } catch (err: any) {
        errors.push(
          `[startup-migration] FAILED — ${step.description}: ${err.message}`
        );
      }
    }

    if (errors.length > 0) {
      for (const e of errors) {
        console.error(e);
      }
      throw new Error(
        `Startup migration encountered ${errors.length} error(s). See logs above.`
      );
    }

    const afterColumns = await getExistingColumns(client);
    const afterTables = await getExistingTables(client);

    const addedColumns = [...afterColumns].filter(
      (c) => !beforeColumns.has(c)
    );
    const addedTables = [...afterTables].filter(
      (t) => !beforeTables.has(t)
    );

    if (addedColumns.length === 0 && addedTables.length === 0) {
      console.log("[startup-migration] All schema checks passed — database is up to date.");
    } else {
      if (addedTables.length > 0) {
        console.log(
          `[startup-migration] Created ${addedTables.length} new table(s): ${addedTables.join(", ")}`
        );
      }
      if (addedColumns.length > 0) {
        console.log(
          `[startup-migration] Added ${addedColumns.length} missing column(s): ${addedColumns.join(", ")}`
        );
      }
    }
  } finally {
    client.release();
  }
}






