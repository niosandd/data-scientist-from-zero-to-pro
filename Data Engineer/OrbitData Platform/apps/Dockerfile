FROM python:3.11-slim

WORKDIR /app

# бновляем сертификаты
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# ременно отключаем проверку SSL (только для локальной сборки)
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

COPY . .

CMD ["python", "producers/iss_producer.py"]
