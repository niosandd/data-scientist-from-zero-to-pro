import json
import time
import logging
from datetime import datetime, timezone

import requests
from confluent_kafka import Producer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("iss-producer")

KAFKA_BOOTSTRAP = "kafka:9092"
TOPIC = "space.iss.position"
ISS_API_URL = "http://api.open-notify.org/iss-now.json"
INTERVAL_SEC = 10


def delivery_report(err, msg):
    if err is not None:
        logger.error(f"Delivery failed: {err}")
    else:
        logger.debug(f"Message delivered to {msg.topic()} [{msg.partition()}]")


def create_producer() -> Producer:
    conf = {
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "client.id": "iss-producer",
        "acks": "all",
    }
    return Producer(conf)


def fetch_iss_position() -> dict | None:
    try:
        resp = requests.get(ISS_API_URL, timeout=5)
        resp.raise_for_status()
        data = resp.json()

        if data.get("message") != "success":
            logger.warning(f"Unexpected API response: {data}")
            return None

        position = data["iss_position"]
        timestamp = data["timestamp"]

        return {
            "event_id": f"iss-{timestamp}",
            "event_time": datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(),
            "domain": "space",
            "source": "open-notify",
            "latitude": float(position["latitude"]),
            "longitude": float(position["longitude"]),
            "raw_timestamp": timestamp,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to fetch ISS position: {e}")
        return None


def main():
    logger.info("Starting ISS Producer...")
    producer = create_producer()

    while True:
        event = fetch_iss_position()
        if event:
            try:
                producer.produce(
                    topic=TOPIC,
                    key=event["event_id"],
                    value=json.dumps(event).encode("utf-8"),
                    callback=delivery_report,
                )
                producer.poll(0)
                logger.info(
                    f"Sent ISS position: lat={event['latitude']:.4f}, lon={event['longitude']:.4f}"
                )
            except Exception as e:
                logger.error(f"Failed to produce message: {e}")

        time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()
