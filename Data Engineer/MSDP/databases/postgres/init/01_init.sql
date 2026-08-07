CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE IF NOT EXISTS raw.events (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON raw.events (created_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON raw.events (event_type);

CREATE OR REPLACE FUNCTION raw.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_updated_at ON raw.events;
CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON raw.events
    FOR EACH ROW
    EXECUTE FUNCTION raw.set_updated_at();