import json
import time
import random
import logging
from datetime import datetime, timezone
from uuid import uuid4

from confluent_kafka import Producer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("banking-producer")

KAFKA_BOOTSTRAP = "kafka:9092"
TOPIC = "banking.transactions"
INTERVAL_SEC = 3

CLIENTS = [f"client_{i:03d}" for i in range(1, 21)]
CURRENCIES = ["RUB", "USD", "EUR"]
TYPES = ["payment", "transfer", "withdrawal", "deposit"]


def delivery_report(err, msg):
    if err:
        logger.error(f"Delivery failed: {err}")


def create_producer():
    return Producer({
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "client.id": "banking-producer",
        "acks": "all",
    })


def generate_transaction():
    amount = round(random.uniform(100, 150000), 2)
    return {
        "event_id": str(uuid4()),
        "event_time": datetime.now(timezone.utc).isoformat(),
        "domain": "banking",
        "source": "core-banking-simulator",
        "transaction_id": f"tx-{uuid4().hex[:12]}",
        "client_id": random.choice(CLIENTS),
        "type": random.choice(TYPES),
        "amount": amount,
        "currency": random.choice(CURRENCIES),
        "status": random.choices(["success", "failed", "pending"], weights=[0.85, 0.1, 0.05])[0],
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    logger.info("Starting Banking Producer...")
    producer = create_producer()

    while True:
        event = generate_transaction()
        try:
            producer.produce(
                topic=TOPIC,
                key=event["client_id"],
                value=json.dumps(event).encode("utf-8"),
                callback=delivery_report,
            )
            producer.poll(0)
            logger.info(f"Sent tx {event['transaction_id']} | {event['client_id']} | {event['amount']} {event['currency']} | {event['status']}")
        except Exception as e:
            logger.error(f"Produce error: {e}")

        time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()
