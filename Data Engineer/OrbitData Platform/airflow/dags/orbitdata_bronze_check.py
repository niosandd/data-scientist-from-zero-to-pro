from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from pathlib import Path
import logging

default_args = {
    "owner": "orbitdata",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

def check_bronze_layer(**context):
    bronze_path = Path("/data/bronze")
    domains = ["space", "banking", "industrial"]
    report = {}

    for domain in domains:
        domain_dir = bronze_path / domain
        if domain_dir.exists():
            files = list(domain_dir.glob("*.parquet"))
            report[domain] = {
                "files_count": len(files),
                "total_size_kb": round(sum(f.stat().st_size for f in files) / 1024, 2)
            }
        else:
            report[domain] = {"files_count": 0, "total_size_kb": 0}

    logging.info(f"Bronze layer status: {report}")
    context["ti"].xcom_push(key="bronze_report", value=report)
    return report


def log_summary(**context):
    report = context["ti"].xcom_pull(key="bronze_report", task_ids="check_bronze")
    logging.info("=" * 50)
    logging.info("ORBITDATA PIPELINE SUMMARY")
    logging.info("=" * 50)
    for domain, stats in report.items():
        logging.info(f"{domain:12} → {stats['files_count']} files, {stats['total_size_kb']} KB")
    logging.info("=" * 50)


with DAG(
    dag_id="orbitdata_bronze_check",
    default_args=default_args,
    description="Check Bronze layer status for OrbitData Platform",
    schedule_interval=None,          # только ручной запуск
    start_date=datetime(2026, 8, 1),
    catchup=False,
    tags=["orbitdata", "bronze", "monitoring"],
) as dag:

    check_bronze = PythonOperator(
        task_id="check_bronze",
        python_callable=check_bronze_layer,
    )

    summary = PythonOperator(
        task_id="log_summary",
        python_callable=log_summary,
    )

    check_bronze >> summary
