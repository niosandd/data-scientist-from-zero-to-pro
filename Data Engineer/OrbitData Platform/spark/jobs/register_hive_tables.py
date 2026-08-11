from pyspark.sql import SparkSession
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hive-tables")

def main():
    spark = (
        SparkSession.builder
        .appName("OrbitData-HiveTables")
        .master("spark://spark-master:7077")
        .enableHiveSupport()
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    # Silver
    spark.sql("""
        CREATE OR REPLACE TEMPORARY VIEW silver_banking
        USING parquet
        OPTIONS (path '/data/silver/banking')
    """)
    spark.sql("""
        CREATE OR REPLACE TEMPORARY VIEW silver_industrial
        USING parquet
        OPTIONS (path '/data/silver/industrial')
    """)
    spark.sql("""
        CREATE OR REPLACE TEMPORARY VIEW silver_space
        USING parquet
        OPTIONS (path '/data/silver/space')
    """)

    # Gold
    spark.sql("""
        CREATE OR REPLACE TEMPORARY VIEW gold_banking_client_stats
        USING parquet
        OPTIONS (path '/data/gold/banking_client_stats')
    """)

    logger.info("Hive-style tables registered successfully")
    logger.info("Example query: SELECT client_id, total_amount FROM gold_banking_client_stats LIMIT 5")

    spark.sql("SELECT client_id, currency, total_amount FROM gold_banking_client_stats LIMIT 5").show()

    spark.stop()

if __name__ == "__main__":
    main()
