import json
import time
import random
import logging
from datetime import datetime, timezone
from uuid import uuid4

from confluent_kafka import Producer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("industrial-producer")

KAFKA_BOOTSTRAP = "kafka:9092"
TOPIC = "industrial.sensors"
INTERVAL_SEC = 5

EQUIPMENT = [
    {"id": "CNC-01", "type": "cnc", "line": "A"},
    {"id": "CNC-02", "type": "cnc", "line": "A"},
    {"id": "PRESS-01", "type": "press", "line": "B"},
    {"id": "ROBOT-01", "type": "robot", "line": "B"},
    {"id": "CONVEYOR-01", "type": "conveyor", "line": "C"},
]


def delivery_report(err, msg):
    if err:
        logger.error(f"Delivery failed: {err}")


def create_producer():
    return Producer({
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "client.id": "industrial-producer",
        "acks": "all",
    })


def generate_sensor_event():
    eq = random.choice(EQUIPMENT)
    temp = round(random.uniform(35.0, 95.0), 1)
    vibration = round(random.uniform(0.1, 12.0), 2)
    status = "warning" if temp > 80 or vibration > 8 else "normal"

    return {
        "event_id": str(uuid4()),
        "event_time": datetime.now(timezone.utc).isoformat(),
        "domain": "industrial",
        "source": "iot-gateway",
        "equipment_id": eq["id"],
        "equipment_type": eq["type"],
        "production_line": eq["line"],
        "temperature_c": temp,
        "vibration_mm_s": vibration,
        "status": status,
        "power_kw": round(random.uniform(5.0, 45.0), 1),
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    logger.info("Starting Industrial Producer...")
    producer = create_producer()

    while True:
        event = generate_sensor_event()
        try:
            producer.produce(
                topic=TOPIC,
                key=event["equipment_id"],
                value=json.dumps(event).encode("utf-8"),
                callback=delivery_report,
            )
            producer.poll(0)
            logger.info(
                f"Sent {event['equipment_id']} | temp={event['temperature_c']}°C | "
                f"vib={event['vibration_mm_s']} | {event['status']}"
            )
        except Exception as e:
            logger.error(f"Produce error: {e}")

        time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()
