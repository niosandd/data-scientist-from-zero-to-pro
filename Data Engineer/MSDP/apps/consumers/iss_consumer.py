"""
ISS Position Consumer
Читает данные из Kafka и:
1. Пишет в MongoDB (real-time / operational store)
2. Периодически сохраняет батч в Parquet через PyArrow (Bronze layer)

Темы курса: Kafka Consumer, NoSQL (MongoDB), PyArrow, форматы файлов
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from kafka import KafkaConsumer
from pymongo import MongoClient
import pyarrow as pa
import pyarrow.parquet as pq

# ================== НАСТРОЙКИ ==================
KAFKA_BOOTSTRAP = "kafka:9092"
TOPIC = "iss-position"
GROUP_ID = "iss-consumer-group"

MONGO_URI = "mongodb://msdp:msdp_secret@mongo:27017/"
MONGO_DB = "msdp"
MONGO_COLLECTION = "iss_positions"

PARQUET_DIR = Path("/app/storage/bronze/iss")
BATCH_SIZE = 5

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("iss-consumer")


def get_mongo_collection():
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    return db[MONGO_COLLECTION]


def save_batch_to_parquet(records: list[dict], output_dir: Path):
    if not records:
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    file_path = output_dir / f"iss_{timestamp}.parquet"

    table = pa.Table.from_pylist(records)
    pq.write_table(table, file_path, compression="snappy")

    logger.info("Saved %d records → %s", len(records), file_path)


def main():
    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id=GROUP_ID,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        consumer_timeout_ms=1000,   # чтобы цикл не блокировался навечно
    )

    collection = get_mongo_collection()
    buffer: list[dict] = []

    logger.info("Consumer started. Listening topic: %s", TOPIC)

    try:
        while True:
            for message in consumer:
                data = message.value
                logger.info(
                    "Received → lat=%.4f lon=%.4f | offset=%s",
                    data.get("latitude"),
                    data.get("longitude"),
                    message.offset,
                )

                # 1. Пишем в MongoDB
                collection.insert_one(data)

                # 2. Копим для Parquet
                # Убираем ObjectId-подобные поля, если вдруг появятся
                clean = {k: v for k, v in data.items() if k != "_id"}
                buffer.append(clean)

                if len(buffer) >= BATCH_SIZE:
                    save_batch_to_parquet(buffer, PARQUET_DIR)
                    buffer.clear()

    except KeyboardInterrupt:
        logger.info("Stopping consumer...")
    finally:
        # Дописываем остаток
        if buffer:
            save_batch_to_parquet(buffer, PARQUET_DIR)
        consumer.close()
        logger.info("Consumer stopped.")


if __name__ == "__main__":
    main()