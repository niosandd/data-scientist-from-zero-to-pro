from pyspark.sql import SparkSession
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("export-formats")

def main():
    spark = (
        SparkSession.builder
        .appName("OrbitData-ExportFormats")
        .master("spark://spark-master:7077")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    df = spark.read.parquet("/data/silver/banking")

    # CSV
    csv_path = "/data/gold/exports/banking_csv"
    (
        df
        .coalesce(1)
        .write
        .mode("overwrite")
        .option("header", "true")
        .csv(csv_path)
    )
    logger.info(f"CSV written to {csv_path}")

    # Avro
    avro_path = "/data/gold/exports/banking_avro"
    (
        df
        .write
        .mode("overwrite")
        .format("avro")
        .save(avro_path)
    )
    logger.info(f"Avro written to {avro_path}")

    # роверка чтения обратно
    csv_df = spark.read.option("header", "true").csv(csv_path)
    avro_df = spark.read.format("avro").load(avro_path)

    logger.info(f"CSV rows: {csv_df.count()}, Avro rows: {avro_df.count()}")
    logger.info("CSV + Avro export completed successfully")

    spark.stop()

if __name__ == "__main__":
    main()
