"""
ISS Position Producer
Координаты МКС → Kafka каждые N секунд.

Темы: API, Kafka Producer, structlog
"""

import json
import time
from datetime import datetime, timezone

import requests
from kafka import KafkaProducer

from apps.logging_setup import setup_logging

log = setup_logging("iss-producer")

# ================== НАСТРОЙКИ ==================
KAFKA_BOOTSTRAP = "kafka:9092"
TOPIC = "iss-position"
API_URL = "http://api.open-notify.org/iss-now.json"
INTERVAL_SEC = 10


def create_producer() -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
        acks="all",
        retries=3,
    )


def fetch_iss_position() -> dict:
    response = requests.get(API_URL, timeout=10)
    response.raise_for_status()
    data = response.json()

    return {
        "timestamp": data.get("timestamp"),
        "datetime_utc": datetime.fromtimestamp(
            data.get("timestamp"), tz=timezone.utc
        ).isoformat(),
        "message": data.get("message"),
        "latitude": float(data["iss_position"]["latitude"]),
        "longitude": float(data["iss_position"]["longitude"]),
        "source": "open-notify",
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    producer = create_producer()
    log.info("producer_started", topic=TOPIC)

    try:
        while True:
            try:
                position = fetch_iss_position()
                key = str(position["timestamp"])

                future = producer.send(TOPIC, key=key, value=position)
                record = future.get(timeout=10)

                log.info(
                    "iss_position_sent",
                    lat=position["latitude"],
                    lon=position["longitude"],
                    partition=record.partition,
                    offset=record.offset,
                )
            except Exception as e:
                log.error("produce_failed", error=str(e))

            time.sleep(INTERVAL_SEC)

    except KeyboardInterrupt:
        log.info("producer_stopping")
    finally:
        producer.flush()
        producer.close()
        log.info("producer_stopped")


if __name__ == "__main__":
    main()