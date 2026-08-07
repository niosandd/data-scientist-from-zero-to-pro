"""
Pull-based загрузка из PostgreSQL (full + incremental)
Тема курса: 2.6 Pull-based загрузка из БД + PyArrow + loguru
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import pyarrow as pa
import pyarrow.parquet as pq
from loguru import logger

# ================== LOGURU ==================
logger.remove()
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {message}",
    level="INFO",
    serialize=False,
)

logger.add(
    "/app/storage/logs/postgres_pull.log",
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {message}",
    level="INFO",
    rotation="5 MB",
)

# ================== НАСТРОЙКИ ==================
PG_HOST = "postgres"
PG_PORT = 5432
PG_DB = "msdp"
PG_USER = "msdp"
PG_PASSWORD = "msdp_secret"

PARQUET_DIR = Path("/app/storage/bronze/postgres_events")
WATERMARK_FILE = Path("/app/storage/bronze/postgres_events/_watermark.json")


def get_connection():
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASSWORD,
    )


def load_watermark():
    """Читаем, до какого updated_at уже выгружали"""
    if WATERMARK_FILE.exists():
        data = json.loads(WATERMARK_FILE.read_text(encoding="utf-8"))
        return data.get("last_updated_at")
    return None


def save_watermark(last_updated_at: str):
    WATERMARK_FILE.parent.mkdir(parents=True, exist_ok=True)
    WATERMARK_FILE.write_text(
        json.dumps({"last_updated_at": last_updated_at}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logger.info("Watermark сохранён: {}", last_updated_at)


def fetch_events(last_updated_at: str | None):
    """
    Если watermark есть — забираем только новые/изменённые записи.
    Если нет — полный снимок.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if last_updated_at:
                logger.info("Инкрементальная загрузка после {}", last_updated_at)
                cur.execute(
                    """
                    SELECT id, event_type, payload::text, created_at, updated_at
                    FROM raw.events
                    WHERE updated_at > %s
                    ORDER BY updated_at, id
                    """,
                    (last_updated_at,),
                )
            else:
                logger.info("Полный снимок (watermark отсутствует)")
                cur.execute(
                    """
                    SELECT id, event_type, payload::text, created_at, updated_at
                    FROM raw.events
                    ORDER BY updated_at, id
                    """
                )

            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
        return columns, rows
    finally:
        conn.close()


def save_to_parquet(columns, rows):
    if not rows:
        logger.info("Нет новых данных для сохранения")
        return None

    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    file_path = PARQUET_DIR / f"events_{timestamp}.parquet"

    records = [dict(zip(columns, row)) for row in rows]

    max_updated_at = None
    for r in records:
        for key in ("created_at", "updated_at"):
            if r.get(key) is not None:
                if key == "updated_at":
                    val = r[key]
                    if max_updated_at is None or val > max_updated_at:
                        max_updated_at = val
                r[key] = r[key].isoformat()

    table = pa.Table.from_pylist(records)
    pq.write_table(table, file_path, compression="snappy")
    logger.info("Сохранено {} записей → {}", len(records), file_path)

    return max_updated_at.isoformat() if max_updated_at else None


def main():
    logger.info("=== Pull-based загрузка из PostgreSQL ===")
    last_updated_at = load_watermark()
    columns, rows = fetch_events(last_updated_at)
    logger.info("Прочитано {} строк", len(rows))

    new_watermark = save_to_parquet(columns, rows)
    if new_watermark:
        save_watermark(new_watermark)

    logger.info("Готово.")


if __name__ == "__main__":
    main()