import pandas as pd
from pathlib import Path
from fastavro import writer, parse_schema
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("export-avro")

def main():
    silver = Path("/data/silver/banking")
    files = list(silver.glob("*.parquet"))
    if not files:
        logger.error("No silver banking files found")
        return

    df = pd.read_parquet(files[0])
    # риводим timestamp к строке для Avro
    for col in df.select_dtypes(include=["datetime64[ns]", "datetimetz"]).columns:
        df[col] = df[col].astype(str)

    records = df.to_dict(orient="records")

    schema = {
        "type": "record",
        "name": "BankingTransaction",
        "namespace": "orbitdata",
        "fields": [{"name": c, "type": ["null", "string", "double", "long"], "default": None} for c in df.columns]
    }
    # прощённая схема (все поля string для совместимости)
    schema = {
        "type": "record",
        "name": "BankingTransaction",
        "fields": [{"name": str(c), "type": "string"} for c in df.columns]
    }

    # онвертируем всё в str
    clean_records = []
    for r in records:
        clean_records.append({k: "" if v is None else str(v) for k, v in r.items()})

    out_dir = Path("/data/gold/exports/banking_avro")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "banking.avro"

    parsed = parse_schema(schema)
    with open(out_file, "wb") as f:
        writer(f, parsed, clean_records)

    logger.info(f"Avro written: {out_file} | rows={len(clean_records)}")

if __name__ == "__main__":
    main()
