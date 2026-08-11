import great_expectations as gx
from great_expectations.core.batch import RuntimeBatchRequest
from pathlib import Path
import pandas as pd
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ge-validate")

SILVER_PATH = Path("/data/silver")

def validate_banking():
    path = SILVER_PATH / "banking"
    files = list(path.glob("*.parquet"))
    if not files:
        logger.warning("No banking files in Silver")
        return False

    df = pd.read_parquet(files[0])  # берём один файл для демо
    logger.info(f"Validating banking, shape={df.shape}")

    context = gx.get_context(mode="ephemeral")

    datasource = context.sources.add_pandas("pandas_source")
    data_asset = datasource.add_dataframe_asset(name="banking_asset")

    batch_request = data_asset.build_batch_request(dataframe=df)

    suite = context.add_expectation_suite("banking_suite")

    validator = context.get_validator(
        batch_request=batch_request,
        expectation_suite_name="banking_suite",
    )

    # азовые проверки качества
    validator.expect_table_row_count_to_be_between(min_value=1, max_value=100000)
    validator.expect_column_values_to_not_be_null("event_id")
    validator.expect_column_values_to_not_be_null("client_id")
    validator.expect_column_values_to_be_between("amount", min_value=0.01, max_value=1_000_000)
    validator.expect_column_values_to_be_in_set("status", ["success", "failed", "pending"])
    validator.expect_column_values_to_be_unique("event_id")

    results = validator.validate()
    success = results["success"]
    logger.info(f"Banking validation success: {success}")
    return success


def validate_industrial():
    path = SILVER_PATH / "industrial"
    files = list(path.glob("*.parquet"))
    if not files:
        logger.warning("No industrial files in Silver")
        return False

    df = pd.read_parquet(files[0])
    logger.info(f"Validating industrial, shape={df.shape}")

    context = gx.get_context(mode="ephemeral")
    datasource = context.sources.add_pandas("pandas_source")
    data_asset = datasource.add_dataframe_asset(name="industrial_asset")
    batch_request = data_asset.build_batch_request(dataframe=df)
    suite = context.add_expectation_suite("industrial_suite")

    validator = context.get_validator(
        batch_request=batch_request,
        expectation_suite_name="industrial_suite",
    )

    validator.expect_table_row_count_to_be_between(min_value=1, max_value=100000)
    validator.expect_column_values_to_not_be_null("equipment_id")
    validator.expect_column_values_to_be_between("temperature_c", min_value=0, max_value=120)
    validator.expect_column_values_to_be_between("vibration_mm_s", min_value=0, max_value=50)

    results = validator.validate()
    success = results["success"]
    logger.info(f"Industrial validation success: {success}")
    return success


def main():
    logger.info("Starting Great Expectations validation on Silver layer...")
    results = {
        "banking": validate_banking(),
        "industrial": validate_industrial(),
    }

    logger.info("=" * 50)
    logger.info("GREAT EXPECTATIONS RESULTS")
    for k, v in results.items():
        logger.info(f"  {k:12} → {'PASSED' if v else 'FAILED'}")
    logger.info("=" * 50)

    if not all(results.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
