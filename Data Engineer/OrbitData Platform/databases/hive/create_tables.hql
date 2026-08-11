-- Silver tables
CREATE EXTERNAL TABLE IF NOT EXISTS silver_banking (
  event_id STRING,
  event_time TIMESTAMP,
  domain STRING,
  source STRING,
  transaction_id STRING,
  client_id STRING,
  type STRING,
  amount DOUBLE,
  currency STRING,
  status STRING,
  ingested_at TIMESTAMP
)
STORED AS PARQUET
LOCATION '/data/silver/banking';

CREATE EXTERNAL TABLE IF NOT EXISTS silver_industrial (
  event_id STRING,
  event_time TIMESTAMP,
  domain STRING,
  source STRING,
  equipment_id STRING,
  equipment_type STRING,
  production_line STRING,
  temperature_c FLOAT,
  vibration_mm_s FLOAT,
  status STRING,
  power_kw FLOAT,
  ingested_at TIMESTAMP
)
STORED AS PARQUET
LOCATION '/data/silver/industrial';

CREATE EXTERNAL TABLE IF NOT EXISTS silver_space (
  event_id STRING,
  event_time TIMESTAMP,
  domain STRING,
  source STRING,
  latitude DOUBLE,
  longitude DOUBLE,
  raw_timestamp INT,
  ingested_at TIMESTAMP
)
STORED AS PARQUET
LOCATION '/data/silver/space';

-- Gold tables
CREATE EXTERNAL TABLE IF NOT EXISTS gold_banking_client_stats (
  client_id STRING,
  currency STRING,
  status STRING,
  tx_count BIGINT,
  total_amount DOUBLE,
  avg_amount DOUBLE,
  first_tx TIMESTAMP,
  last_tx TIMESTAMP
)
STORED AS PARQUET
LOCATION '/data/gold/banking_client_stats';
