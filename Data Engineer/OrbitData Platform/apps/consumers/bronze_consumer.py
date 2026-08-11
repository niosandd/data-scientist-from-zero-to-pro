import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from confluent_kafka import Consumer, KafkaError, KafkaException
import pyarrow as pa
import pyarrow.parquet as pq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("bronze-consumer")

KAFKA_BOOTSTRAP = "kafka:9092"
TOPICS = [
    "space.iss.position",
    "banking.transactions",
    "industrial.sensors",
]
GROUP_ID = "bronze-consumer-group"
BRONZE_PATH = Path("/data/bronze")
BATCH_SIZE = 20          # сколько сообщений копить перед записью
FLUSH_INTERVAL_SEC = 30  # или по времени


def create_consumer() -> Consumer:
    conf = {
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": GROUP_ID,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
    }
    consumer = Consumer(conf)
    consumer.subscribe(TOPICS)
    return consumer


def get_domain_from_topic(topic: str) -> str:
    return topic.split(".")[0]  # space / banking / industrial


def write_batch_to_parquet(domain: str, records: list[dict]):
    if not records:
        return

    domain_dir = BRONZE_PATH / domain
    domain_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    filename = domain_dir / f"data_{now.strftime('%Y%m%d_%H%M%S')}_{len(records)}.parquet"

    table = pa.Table.from_pylist(records)
    pq.write_table(table, filename, compression="snappy")
    logger.info(f"Wrote {len(records)} records → {filename}")


def main():
    logger.info("Starting Bronze Consumer...")
    logger.info(f"Subscribed to topics: {TOPICS}")

    consumer = create_consumer()
    buffers = {domain: [] for domain in ["space", "banking", "industrial"]}
    last_flush = datetime.now(timezone.utc)

    try:
        while True:
            msg = consumer.poll(1.0)

            if msg is None:
                # периодический flush по времени
                if (datetime.now(timezone.utc) - last_flush).total_seconds() >= FLUSH_INTERVAL_SEC:
                    for domain, buf in buffers.items():
                        if buf:
                            write_batch_to_parquet(domain, buf)
                            buffers[domain] = []
                    consumer.commit(asynchronous=False)
                    last_flush = datetime.now(timezone.utc)
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise KafkaException(msg.error())

            try:
                value = json.loads(msg.value().decode("utf-8"))
                domain = get_domain_from_topic(msg.topic())
                buffers[domain].append(value)

                # flush по размеру батча
                if len(buffers[domain]) >= BATCH_SIZE:
                    write_batch_to_parquet(domain, buffers[domain])
                    buffers[domain] = []
                    consumer.commit(asynchronous=False)
                    last_flush = datetime.now(timezone.utc)

            except Exception as e:
                logger.error(f"Failed to process message: {e}")

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        # финальный flush
        for domain, buf in buffers.items():
            if buf:
                write_batch_to_parquet(domain, buf)
        consumer.close()
        logger.info("Consumer closed")


if __name__ == "__main__":
    main()
