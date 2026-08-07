"""
ISS Position Producer
Отправляет координаты Международной космической станции в Kafka каждые N секунд.
Тема курса: API + Kafka Producer + потоковые данные
"""

import json
import time
import logging
from datetime import datetime, timezone

import requests
from kafka import KafkaProducer

# ================== НАСТРОЙКИ ==================
KAFKA_BOOTSTRAP = "kafka:9092"
TOPIC = "iss-position"
API_URL = "http://api.open-notify.org/iss-now.json"
INTERVAL_SEC = 10

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("iss-producer")


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

    # Нормализуем структуру
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
    logger.info("Producer started. Topic: %s", TOPIC)

    try:
        while True:
            try:
                position = fetch_iss_position()
                # Ключ — timestamp, чтобы сообщения одного момента шли в одну партицию
                key = str(position["timestamp"])

                future = producer.send(TOPIC, key=key, value=position)
                record = future.get(timeout=10)

                logger.info(
                    "Sent → lat=%.4f lon=%.4f | partition=%s offset=%s",
                    position["latitude"],
                    position["longitude"],
                    record.partition,
                    record.offset,
                )
            except Exception as e:
                logger.error("Error while producing: %s", e)

            time.sleep(INTERVAL_SEC)

    except KeyboardInterrupt:
        logger.info("Stopping producer...")
    finally:
        producer.flush()
        producer.close()
        logger.info("Producer stopped.")


if __name__ == "__main__":
    main()