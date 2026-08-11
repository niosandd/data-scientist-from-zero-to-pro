from pyspark.sql import SparkSession
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("export-csv")

def main():
    spark = (
        SparkSession.builder
        .appName("OrbitData-ExportCSV")
        .master("spark://spark-master:7077")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    df = spark.read.parquet("/data/silver/banking")

    csv_path = "/data/gold/exports/banking_csv"
    (
        df.coalesce(1)
        .write
        .mode("overwrite")
        .option("header", "true")
        .csv(csv_path)
    )

    count = spark.read.option("header", "true").csv(csv_path).count()
    logger.info(f"CSV written to {csv_path}, rows={count}")
    spark.stop()

if __name__ == "__main__":
    main()
