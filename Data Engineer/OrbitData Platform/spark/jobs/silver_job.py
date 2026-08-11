from pyspark.sql import SparkSession
from pyspark.sql import functions as F
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("silver-job")

BRONZE_PATH = "/data/bronze"
SILVER_PATH = "/data/silver"

def get_spark():
    return (
        SparkSession.builder
        .appName("OrbitData-Silver")
        .master("spark://spark-master:7077")
        .config("spark.sql.session.timeZone", "UTC")
        .config("spark.executor.memory", "1g")
        .config("spark.driver.memory", "1g")
        .getOrCreate()
    )

def process_space(spark):
    df = spark.read.parquet(f"{BRONZE_PATH}/space")
    silver = (
        df
        .withColumn("event_time", F.to_timestamp("event_time"))
        .withColumn("ingested_at", F.to_timestamp("ingested_at"))
        .withColumn("latitude", F.col("latitude").cast("double"))
        .withColumn("longitude", F.col("longitude").cast("double"))
        .dropDuplicates(["event_id"])
        .filter(F.col("latitude").isNotNull() & F.col("longitude").isNotNull())
    )
    out = f"{SILVER_PATH}/space"
    silver.write.mode("overwrite").parquet(out)
    cnt = silver.count()
    logger.info(f"Space → {cnt} rows written to {out}")
    return cnt

def process_banking(spark):
    df = spark.read.parquet(f"{BRONZE_PATH}/banking")
    silver = (
        df
        .withColumn("event_time", F.to_timestamp("event_time"))
        .withColumn("ingested_at", F.to_timestamp("ingested_at"))
        .withColumn("amount", F.col("amount").cast("double"))
        .withColumn("status", F.lower(F.col("status")))
        .dropDuplicates(["event_id"])
        .filter(F.col("amount") > 0)
    )
    out = f"{SILVER_PATH}/banking"
    silver.write.mode("overwrite").parquet(out)
    cnt = silver.count()
    logger.info(f"Banking → {cnt} rows written to {out}")
    return cnt

def process_industrial(spark):
    df = spark.read.parquet(f"{BRONZE_PATH}/industrial")
    silver = (
        df
        .withColumn("event_time", F.to_timestamp("event_time"))
        .withColumn("ingested_at", F.to_timestamp("ingested_at"))
        .withColumn("temperature_c", F.col("temperature_c").cast("float"))
        .withColumn("vibration_mm_s", F.col("vibration_mm_s").cast("float"))
        .withColumn("power_kw", F.col("power_kw").cast("float"))
        .dropDuplicates(["event_id"])
        .filter(F.col("temperature_c").isNotNull())
    )
    out = f"{SILVER_PATH}/industrial"
    silver.write.mode("overwrite").parquet(out)
    cnt = silver.count()
    logger.info(f"Industrial → {cnt} rows written to {out}")
    return cnt

def main():
    logger.info("Starting Silver job...")
    spark = get_spark()
    spark.sparkContext.setLogLevel("WARN")

    results = {}
    try:
        results["space"] = process_space(spark)
        results["banking"] = process_banking(spark)
        results["industrial"] = process_industrial(spark)
    except Exception as e:
        logger.error(f"Silver job failed: {e}")
        raise
    finally:
        spark.stop()

    logger.info("=" * 40)
    logger.info("SILVER JOB COMPLETED")
    for k, v in results.items():
        logger.info(f"  {k:12} → {v} rows")
    logger.info("=" * 40)

if __name__ == "__main__":
    main()
