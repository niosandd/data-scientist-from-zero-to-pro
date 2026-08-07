-- Таблица для CDC-событий
CREATE TABLE IF NOT EXISTS raw.events_cdc (
    cdc_id          BIGSERIAL PRIMARY KEY,
    operation       VARCHAR(10) NOT NULL,
    event_id        BIGINT,
    event_type      VARCHAR(100),
    payload         JSONB,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Функция триггера
CREATE OR REPLACE FUNCTION raw.events_cdc_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO raw.events_cdc(operation, event_id, event_type, payload)
        VALUES ('INSERT', NEW.id, NEW.event_type, NEW.payload);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO raw.events_cdc(operation, event_id, event_type, payload)
        VALUES ('UPDATE', NEW.id, NEW.event_type, NEW.payload);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO raw.events_cdc(operation, event_id, event_type, payload)
        VALUES ('DELETE', OLD.id, OLD.event_type, OLD.payload);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trg_events_cdc ON raw.events;
CREATE TRIGGER trg_events_cdc
    AFTER INSERT OR UPDATE OR DELETE ON raw.events
    FOR EACH ROW
    EXECUTE FUNCTION raw.events_cdc_trigger();