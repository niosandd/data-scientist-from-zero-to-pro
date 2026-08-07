"""
CDC reader: читает изменения из raw.events_cdc,
отправляет в Kafka и сохраняет в Parquet.
Тема курса: 2.5 CDC (push-based)
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import pyarrow as pa
import pyarrow.parquet as pq
from kafka import KafkaProducer

# ================== НАСТРОЙКИ ==================
PG_HOST = "postgres"
PG_PORT = 5432
PG_DB = "msdp"
PG_USER = "msdp"
PG_PASSWORD = "msdp_secret"

KAFKA_BOOTSTRAP = "kafka:9092"
TOPIC = "cdc-events"

PARQUET_DIR = Path("/app/storage/bronze/cdc_events")
WATERMARK_FILE = Path("/app/storage/bronze/cdc_events/_watermark.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("cdc-to-kafka")


def get_pg_connection():
    return psycopg2.connect(
        host=PG_HOST, port=PG_PORT, dbname=PG_DB,
        user=PG_USER, password=PG_PASSWORD
    )


def get_producer():
    return KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
        acks="all",
        retries=3,
    )


def load_watermark() -> int:
    if WATERMARK_FILE.exists():
        data = json.loads(WATERMARK_FILE.read_text(encoding="utf-8"))
        return int(data.get("last_cdc_id", 0))
    return 0


def save_watermark(last_cdc_id: int):
    WATERMARK_FILE.parent.mkdir(parents=True, exist_ok=True)
    WATERMARK_FILE.write_text(
        json.dumps({"last_cdc_id": last_cdc_id}, indent=2),
        encoding="utf-8"
    )
    logger.info("Watermark сохранён: last_cdc_id=%s", last_cdc_id)


def fetch_new_cdc_events(last_cdc_id: int):
    conn = get_pg_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cdc_id, operation, event_id, event_type, payload, changed_at
                FROM raw.events_cdc
                WHERE cdc_id > %s
                ORDER BY cdc_id
            """, (last_cdc_id,))
            rows = cur.fetchall()
        return rows
    finally:
        conn.close()


def save_to_parquet(records: list[dict]):
    if not records:
        return

    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    file_path = PARQUET_DIR / f"cdc_{timestamp}.parquet"

    table = pa.Table.from_pylist(records)
    pq.write_table(table, file_path, compression="snappy")
    logger.info("Parquet: сохранено %d записей → %s", len(records), file_path)


def main():
    producer = get_producer()
    last_cdc_id = load_watermark()

    logger.info("CDC → Kafka + Parquet. Topic: %s | watermark=%s", TOPIC, last_cdc_id)

    rows = fetch_new_cdc_events(last_cdc_id)
    logger.info("Найдено %d новых CDC-событий", len(rows))

    if not rows:
        producer.close()
        logger.info("Нечего отправлять.")
        return

    parquet_records = []
    max_cdc_id = last_cdc_id

    for row in rows:
        cdc_id, operation, event_id, event_type, payload, changed_at = row

        message = {
            "cdc_id": cdc_id,
            "operation": operation,
            "event_id": event_id,
            "event_type": event_type,
            "payload": payload,
            "changed_at": changed_at.isoformat() if changed_at else None,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }

        future = producer.send(TOPIC, value=message)
        record = future.get(timeout=10)

        logger.info(
            "Sent CDC → op=%s event_id=%s | partition=%s offset=%s",
            operation, event_id, record.partition, record.offset
        )

        parquet_records.append(message)
        max_cdc_id = cdc_id

    producer.flush()
    producer.close()

    save_to_parquet(parquet_records)
    save_watermark(max_cdc_id)

    logger.info("Готово. Последний cdc_id=%s", max_cdc_id)


if __name__ == "__main__":
    main()