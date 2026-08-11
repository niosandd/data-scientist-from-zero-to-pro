from pathlib import Path

#  контейнере DAG смонтирован сюда:
DAGS_DIR = Path("/opt/airflow/dags")


def test_dag_file_exists():
    dag_file = DAGS_DIR / "orbitdata_pipeline.py"
    assert dag_file.exists(), f"DAG not found at {dag_file}"


def test_dag_has_expected_tasks():
    content = (DAGS_DIR / "orbitdata_pipeline.py").read_text(encoding="utf-8")
    for task_id in ["check_bronze", "run_silver", "run_gold", "final_summary"]:
        assert task_id in content, f"Missing task: {task_id}"
