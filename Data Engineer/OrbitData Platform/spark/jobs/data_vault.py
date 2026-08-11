from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.window import Window
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("data-vault")

SILVER_PATH = "/data/silver"
DV_PATH = "/data/gold/data_vault"

def get_spark():
    return (
        SparkSession.builder
        .appName("OrbitData-DataVault")
        .master("spark://spark-master:7077")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )

def build_hub_client(spark):
    df = spark.read.parquet(f"{SILVER_PATH}/banking")

    hub = (
        df
        .select("client_id")
        .dropDuplicates(["client_id"])
        .withColumn("hub_client_hk", F.sha2(F.col("client_id"), 256))
        .withColumn("load_dts", F.current_timestamp())
        .withColumn("record_source", F.lit("banking.transactions"))
        .select("hub_client_hk", "client_id", "load_dts", "record_source")
    )

    out = f"{DV_PATH}/hub_client"
    hub.write.mode("overwrite").parquet(out)
    logger.info(f"Hub_Client → {hub.count()} rows")
    return hub

def build_sat_client(spark):
    # ля демо используем агрегаты как "детали" клиента
    df = spark.read.parquet(f"{SILVER_PATH}/banking")

    sat = (
        df
        .groupBy("client_id")
        .agg(
            F.count("*").alias("tx_count"),
            F.round(F.sum("amount"), 2).alias("total_amount"),
            F.first("currency").alias("main_currency")
        )
        .withColumn("hub_client_hk", F.sha2(F.col("client_id"), 256))
        .withColumn("load_dts", F.current_timestamp())
        .withColumn("record_source", F.lit("banking.transactions"))
        .withColumn("hashdiff", F.sha2(F.concat_ws("||", "tx_count", "total_amount", "main_currency"), 256))
        .select("hub_client_hk", "load_dts", "record_source", "hashdiff", "tx_count", "total_amount", "main_currency")
    )

    out = f"{DV_PATH}/sat_client_details"
    sat.write.mode("overwrite").parquet(out)
    logger.info(f"Sat_Client_Details → {sat.count()} rows")
    return sat

def build_link_transaction(spark):
    df = spark.read.parquet(f"{SILVER_PATH}/banking")

    link = (
        df
        .select("client_id", "transaction_id", "event_time")
        .withColumn("link_tx_hk", F.sha2(F.concat_ws("||", "client_id", "transaction_id"), 256))
        .withColumn("hub_client_hk", F.sha2(F.col("client_id"), 256))
        .withColumn("load_dts", F.current_timestamp())
        .withColumn("record_source", F.lit("banking.transactions"))
        .select("link_tx_hk", "hub_client_hk", "transaction_id", "event_time", "load_dts", "record_source")
    )

    out = f"{DV_PATH}/link_transaction"
    link.write.mode("overwrite").parquet(out)
    logger.info(f"Link_Transaction → {link.count()} rows")
    return link

def build_sat_transaction(spark):
    df = spark.read.parquet(f"{SILVER_PATH}/banking")

    sat = (
        df
        .withColumn("link_tx_hk", F.sha2(F.concat_ws("||", "client_id", "transaction_id"), 256))
        .withColumn("load_dts", F.current_timestamp())
        .withColumn("record_source", F.lit("banking.transactions"))
        .withColumn("hashdiff", F.sha2(F.concat_ws("||", "type", "amount", "currency", "status"), 256))
        .select(
            "link_tx_hk", "load_dts", "record_source", "hashdiff",
            "type", "amount", "currency", "status", "event_id"
        )
    )

    out = f"{DV_PATH}/sat_transaction"
    sat.write.mode("overwrite").parquet(out)
    logger.info(f"Sat_Transaction → {sat.count()} rows")
    return sat

def main():
    logger.info("Building Data Vault model...")
    spark = get_spark()
    spark.sparkContext.setLogLevel("WARN")

    try:
        build_hub_client(spark)
        build_sat_client(spark)
        build_link_transaction(spark)
        build_sat_transaction(spark)
        logger.info("Data Vault completed successfully")
    finally:
        spark.stop()

if __name__ == "__main__":
    main()
