CREATE DATABASE IF NOT EXISTS orbitdata;

-- Space (ISS)
CREATE TABLE IF NOT EXISTS orbitdata.iss_position
(
    event_id String,
    event_time DateTime64(3, 'UTC'),
    domain LowCardinality(String),
    source LowCardinality(String),
    latitude Float64,
    longitude Float64,
    raw_timestamp UInt32,
    ingested_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree()
ORDER BY (event_time, event_id);

-- Banking
CREATE TABLE IF NOT EXISTS orbitdata.transactions
(
    event_id String,
    event_time DateTime64(3, 'UTC'),
    domain LowCardinality(String),
    source LowCardinality(String),
    transaction_id String,
    client_id LowCardinality(String),
    type LowCardinality(String),
    amount Float64,
    currency LowCardinality(String),
    status LowCardinality(String),
    ingested_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree()
ORDER BY (event_time, client_id, transaction_id);

-- Industrial
CREATE TABLE IF NOT EXISTS orbitdata.sensors
(
    event_id String,
    event_time DateTime64(3, 'UTC'),
    domain LowCardinality(String),
    source LowCardinality(String),
    equipment_id LowCardinality(String),
    equipment_type LowCardinality(String),
    production_line LowCardinality(String),
    temperature_c Float32,
    vibration_mm_s Float32,
    status LowCardinality(String),
    power_kw Float32,
    ingested_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree()
ORDER BY (event_time, equipment_id);
