# MSDP

Ingestion-платформа: несколько источников → Kafka / NiFi → MongoDB + Parquet, плюс мониторинг.

Пет-проект по курсу Data Engineer. Здесь только то, что нужно, чтобы поднять стек у себя.

---

## Что понадобится

- Docker Desktop (WSL2 backend на Windows)
- **минимум 8 GB RAM** под Docker (NiFi жрёт много)
- 10+ GB свободного места
- Git, если клонируешь репозиторий

Python и venv нужны только если хочешь гонять скрипты с хоста. Внутри Compose они уже крутятся в контейнерах.

---

## Быстрый старт

```bash
cd docker
docker compose up -d
```

Первый запуск долгий: качает образы (Kafka, NiFi, Grafana и т.д.). Может занять 5–15 минут в зависимости от сети.

Проверка:

```bash
docker compose ps
```

Почти всё должно быть `Up` / `healthy`.  
`loki` иногда стартует с задержкой — подожди минуту и глянь ещё раз.

---

## Куда стучаться

| Что | Адрес | Логин |
|-----|-------|-------|
| Grafana | http://localhost:3001 | admin / admin |
| NiFi | http://localhost:8080/nifi | admin / admin1234567890 |
| NiFi Registry | http://localhost:18081/nifi-registry | — |
| Prometheus | http://localhost:9091 | — |
| Alertmanager | http://localhost:9095 | — |

Порты сдвинуты (3001, 9091, 9095, 8088), чтобы не конфликтовать с тем, что уже занято на машине.

---

## Что уже работает после `up -d`

1. **Producer** каждые несколько секунд пишет координаты МКС в Kafka (`iss-position`)
2. **Consumer** читает топик → MongoDB + Parquet в `storage/bronze/iss/`
3. **Мониторинг** собирает метрики (Prometheus) и логи (Loki)

Логи producer/consumer:

```bash
docker compose logs -f producer
docker compose logs -f consumer
```

Данные в Mongo:

```bash
docker compose exec mongo mongosh -u msdp -p msdp_secret --authenticationDatabase admin \
  --eval "db.getSiblingDB('msdp').iss_positions.countDocuments()"
```

Файлы на диске:

```bash
# из корня проекта
dir storage\bronze\iss          # Windows
ls storage/bronze/iss           # Linux/macOS
```

---

## Остальные пайплайны (запуск руками)

### Pull из Postgres

Сначала в базе должны быть данные. Если таблица пустая — накати сид:

```bash
docker compose exec -T postgres psql -U msdp -d msdp -f /docker-entrypoint-initdb.d/02_seed.sql
```

Потом:

```bash
docker compose run --rm --entrypoint python consumer apps/pull_loaders/postgres_pull.py
```

Появится файл в `storage/bronze/postgres_events/`.  
Повторный запуск заберёт только новые строки (watermark).

### CDC

Триггеры поднимаются из `databases/postgres/init/03_cdc.sql` (если ещё не накатаны — прогони SQL вручную).

Добавь событие:

```bash
docker compose exec postgres psql -U msdp -d msdp -c \
  "INSERT INTO raw.events (event_type, payload) VALUES ('purchase', jsonb_build_object('order_id', 999, 'amount', 100));"
```

Отправь CDC в Kafka + Parquet:

```bash
docker compose run --rm --entrypoint python consumer apps/pull_loaders/cdc_to_kafka.py
```

### NiFi

UI: http://localhost:8080/nifi

На canvas уже можно собрать (или восстановить) flow'ы:
- HTTP API → файл
- FTP → файл / Kafka
- ExecuteSQL → файл

FTP-сервер: `localhost:21`, пользователь `msdp` / `msdp_secret`.  
Тестовые файлы клади в `storage/ftp_inbox/`.

---

## Мониторинг

Grafana → дашборд **MSDP Overview** (или импортируй Kafka dashboard ID 7589 вручную, если пусто).

Полезные запросы в Explore:

```promql
up
count(up)
container_memory_usage_bytes{id="/docker"}
rate(container_cpu_usage_seconds_total{id="/docker"}[1m])
```

Алерты: http://localhost:9091/rules — группа `msdp-alerts`.

---

## Если что-то не поднимается

**Порт занят**
```bash
netstat -an | findstr "3001 9091 9092 8080"
```
Поменяй проброс в `docker-compose.yml` и перезапусти сервис.

**Kafka не принимает сообщения**  
Producer/consumer должны ходить на `kafka:9092` *из контейнеров*. С хоста bootstrap — `localhost:9092` или `localhost:19092` (смотрите актуальные ports в compose).

**NiFi долго стартует**  
Нормально, 1–3 минуты. Смотри `docker compose logs nifi`.

**Loki в Restarting**  
Проверь `monitoring/loki/loki-config.yml` — в версии 3.x нельзя использовать устаревшие поля вроде `max_look_back_period`.

**Мало RAM**  
Останови тяжёлое:
```bash
docker compose stop nifi nifi-registry
```

---

## Остановка

```bash
cd docker
docker compose down
```

Данные в volumes сохранятся. Снести всё вместе с данными:

```bash
docker compose down -v
```

---

## Структура

```text
MSDP/
├── apps/
│   ├── producers/iss_producer.py
│   ├── consumers/iss_consumer.py
│   └── pull_loaders/
│       ├── postgres_pull.py
│       └── cdc_to_kafka.py
├── databases/postgres/init/     # SQL при первом старте Postgres
├── docker/docker-compose.yml
├── monitoring/                  # prometheus, grafana, loki, alertmanager
├── storage/bronze/              # сюда пишутся Parquet/JSON
└── docs/architecture.md         # как устроены потоки
```

Подробнее про потоки данных — в [docs/architecture.md](docs/architecture.md).
