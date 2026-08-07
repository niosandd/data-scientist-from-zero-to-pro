FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

COPY apps/ ./apps/
COPY storage/ ./storage/

CMD ["python", "apps/producers/iss_producer.py"]