from pyspark.sql import SparkSession
from pyspark.sql import functions as F
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("gold-job")

SILVER_PATH = "/data/silver"
GOLD_PATH = "/data/gold"

def get_spark():
    return (
        SparkSession.builder
        .appName("OrbitData-Gold")
        .master("spark://spark-master:7077")
        .config("spark.sql.session.timeZone", "UTC")
        .config("spark.executor.memory", "1g")
        .config("spark.driver.memory", "1g")
        .getOrCreate()
    )

def process_banking_gold(spark):
    df = spark.read.parquet(f"{SILVER_PATH}/banking")

    gold = (
        df
        .groupBy("client_id", "currency", "status")
        .agg(
            F.count("*").alias("tx_count"),
            F.round(F.sum("amount"), 2).alias("total_amount"),
            F.round(F.avg("amount"), 2).alias("avg_amount"),
            F.min("event_time").alias("first_tx"),
            F.max("event_time").alias("last_tx")
        )
    )

    out = f"{GOLD_PATH}/banking_client_stats"
    gold.write.mode("overwrite").parquet(out)
    cnt = gold.count()
    logger.info(f"Banking Gold → {cnt} rows written to {out}")
    return cnt

def process_industrial_gold(spark):
    df = spark.read.parquet(f"{SILVER_PATH}/industrial")

    gold = (
        df
        .groupBy("equipment_id", "equipment_type", "production_line", "status")
        .agg(
            F.count("*").alias("readings_count"),
            F.round(F.avg("temperature_c"), 1).alias("avg_temp"),
            F.round(F.max("temperature_c"), 1).alias("max_temp"),
            F.round(F.avg("vibration_mm_s"), 2).alias("avg_vibration"),
            F.round(F.avg("power_kw"), 1).alias("avg_power")
        )
    )

    out = f"{GOLD_PATH}/industrial_equipment_stats"
    gold.write.mode("overwrite").parquet(out)
    cnt = gold.count()
    logger.info(f"Industrial Gold → {cnt} rows written to {out}")
    return cnt

def process_space_gold(spark):
    df = spark.read.parquet(f"{SILVER_PATH}/space")

    gold = (
        df
        .withColumn("hour", F.date_trunc("hour", "event_time"))
        .groupBy("hour")
        .agg(
            F.count("*").alias("points_count"),
            F.round(F.avg("latitude"), 4).alias("avg_lat"),
            F.round(F.avg("longitude"), 4).alias("avg_lon")
        )
        .orderBy("hour")
    )

    out = f"{GOLD_PATH}/space_hourly_position"
    gold.write.mode("overwrite").parquet(out)
    cnt = gold.count()
    logger.info(f"Space Gold → {cnt} rows written to {out}")
    return cnt

def main():
    logger.info("Starting Gold job...")
    spark = get_spark()
    spark.sparkContext.setLogLevel("WARN")

    results = {}
    try:
        results["banking"] = process_banking_gold(spark)
        results["industrial"] = process_industrial_gold(spark)
        results["space"] = process_space_gold(spark)
    except Exception as e:
        logger.error(f"Gold job failed: {e}")
        raise
    finally:
        spark.stop()

    logger.info("=" * 40)
    logger.info("GOLD JOB COMPLETED")
    for k, v in results.items():
        logger.info(f"  {k:12} → {v} rows")
    logger.info("=" * 40)

if __name__ == "__main__":
    main()
