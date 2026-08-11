import json
import logging
from datetime import datetime

from confluent_kafka import Consumer, KafkaError, KafkaException
from clickhouse_driver import Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("clickhouse-consumer")

KAFKA_BOOTSTRAP = "kafka:9092"
TOPICS = [
    "space.iss.position",
    "banking.transactions",
    "industrial.sensors",
]
GROUP_ID = "clickhouse-consumer-group"

CLICKHOUSE_HOST = "clickhouse"
CLICKHOUSE_USER = "orbit"
CLICKHOUSE_PASSWORD = "orbit_secret"
CLICKHOUSE_DB = "orbitdata"


def create_kafka_consumer() -> Consumer:
    conf = {
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": GROUP_ID,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
        "auto.commit.interval.ms": 5000,
    }
    consumer = Consumer(conf)
    consumer.subscribe(TOPICS)
    return consumer


def create_ch_client() -> Client:
    return Client(
        host=CLICKHOUSE_HOST,
        user=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        database=CLICKHOUSE_DB,
    )


def insert_iss(client: Client, event: dict):
    client.execute(
        """
        INSERT INTO iss_position (
            event_id, event_time, domain, source,
            latitude, longitude, raw_timestamp, ingested_at
        ) VALUES
        """,
        [{
            "event_id": event["event_id"],
            "event_time": datetime.fromisoformat(event["event_time"].replace("Z", "+00:00")),
            "domain": event["domain"],
            "source": event["source"],
            "latitude": event["latitude"],
            "longitude": event["longitude"],
            "raw_timestamp": event["raw_timestamp"],
            "ingested_at": datetime.fromisoformat(event["ingested_at"].replace("Z", "+00:00")),
        }]
    )


def insert_transaction(client: Client, event: dict):
    client.execute(
        """
        INSERT INTO transactions (
            event_id, event_time, domain, source,
            transaction_id, client_id, type, amount, currency, status, ingested_at
        ) VALUES
        """,
        [{
            "event_id": event["event_id"],
            "event_time": datetime.fromisoformat(event["event_time"].replace("Z", "+00:00")),
            "domain": event["domain"],
            "source": event["source"],
            "transaction_id": event["transaction_id"],
            "client_id": event["client_id"],
            "type": event["type"],
            "amount": event["amount"],
            "currency": event["currency"],
            "status": event["status"],
            "ingested_at": datetime.fromisoformat(event["ingested_at"].replace("Z", "+00:00")),
        }]
    )


def insert_sensor(client: Client, event: dict):
    client.execute(
        """
        INSERT INTO sensors (
            event_id, event_time, domain, source,
            equipment_id, equipment_type, production_line,
            temperature_c, vibration_mm_s, status, power_kw, ingested_at
        ) VALUES
        """,
        [{
            "event_id": event["event_id"],
            "event_time": datetime.fromisoformat(event["event_time"].replace("Z", "+00:00")),
            "domain": event["domain"],
            "source": event["source"],
            "equipment_id": event["equipment_id"],
            "equipment_type": event["equipment_type"],
            "production_line": event["production_line"],
            "temperature_c": event["temperature_c"],
            "vibration_mm_s": event["vibration_mm_s"],
            "status": event["status"],
            "power_kw": event["power_kw"],
            "ingested_at": datetime.fromisoformat(event["ingested_at"].replace("Z", "+00:00")),
        }]
    )


def main():
    logger.info("Starting ClickHouse Consumer...")
    consumer = create_kafka_consumer()
    ch = create_ch_client()

    # проверка соединения
    ch.execute("SELECT 1")
    logger.info("Connected to ClickHouse")

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise KafkaException(msg.error())

            try:
                event = json.loads(msg.value().decode("utf-8"))
                topic = msg.topic()

                if topic == "space.iss.position":
                    insert_iss(ch, event)
                elif topic == "banking.transactions":
                    insert_transaction(ch, event)
                elif topic == "industrial.sensors":
                    insert_sensor(ch, event)

                logger.info(f"Inserted into ClickHouse from {topic} | event_id={event.get('event_id')}")

            except Exception as e:
                logger.error(f"Failed to process message: {e}")

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        consumer.close()


if __name__ == "__main__":
    main()
