import sys
from pathlib import Path
import pytest

#  контейнере код лежит в /app
sys.path.insert(0, "/app")

from quality.validate_silver import validate_banking, validate_industrial


def test_banking_validation_runs():
    """Тест просто проверяет, что функция отрабатывает без исключения."""
    result = validate_banking()
    assert isinstance(result, bool)


def test_industrial_validation_runs():
    result = validate_industrial()
    assert isinstance(result, bool)


def test_silver_path_logic():
    from pathlib import Path
    silver = Path("/data/silver")
    # просто проверяем, что Path работает
    assert silver.name == "silver"
