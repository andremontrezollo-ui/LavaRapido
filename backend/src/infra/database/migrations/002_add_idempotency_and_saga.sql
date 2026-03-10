-- Migration: 002_add_idempotency_and_saga.sql
-- Adds: idempotency_keys, processed_messages, saga_state, users, user_wallets, ledger_entries

-- 1. Idempotency keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id             BIGSERIAL    PRIMARY KEY,
    request_hash   TEXT         NOT NULL UNIQUE,
    status         TEXT         NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    result         TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at     TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
    ON idempotency_keys (expires_at);

-- 2. Processed messages table (replay protection registry)
CREATE TABLE IF NOT EXISTS processed_messages (
    id             BIGSERIAL    PRIMARY KEY,
    message_id     TEXT         NOT NULL UNIQUE,
    signature      TEXT         NOT NULL,
    processed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_processed_at
    ON processed_messages (processed_at);

-- 3. Saga state table
CREATE TABLE IF NOT EXISTS saga_state (
    saga_id          TEXT         PRIMARY KEY,
    name             TEXT         NOT NULL,
    status           TEXT         NOT NULL CHECK (status IN ('started', 'step_completed', 'completed', 'compensating', 'compensated', 'failed')),
    current_step     INTEGER      NOT NULL DEFAULT 0,
    completed_steps  JSONB        NOT NULL DEFAULT '[]',
    failed_step      TEXT,
    error            TEXT,
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saga_state_status
    ON saga_state (status)
    WHERE status IN ('started', 'step_completed', 'compensating');

-- 4. Users table
CREATE TABLE IF NOT EXISTS users (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT         NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    roles          TEXT[]       NOT NULL DEFAULT ARRAY['user'],
    scopes         TEXT[]       NOT NULL DEFAULT ARRAY['deposits:write', 'deposits:read'],
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 5. User wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    balance          DECIMAL(20,8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    reserved_amount  DECIMAL(20,8) NOT NULL DEFAULT 0 CHECK (reserved_amount >= 0),
    network_id       TEXT          NOT NULL,
    wallet_address   TEXT          NOT NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, network_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets (user_id);

-- 6. Ledger entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id                BIGSERIAL     PRIMARY KEY,
    user_id           UUID          NOT NULL REFERENCES users (id),
    deposit_id        TEXT          NOT NULL UNIQUE,
    transaction_hash  TEXT          NOT NULL,
    amount            DECIMAL(20,8) NOT NULL,
    status            TEXT          NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'compensated')),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id     ON ledger_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_deposit_id  ON ledger_entries (deposit_id);
