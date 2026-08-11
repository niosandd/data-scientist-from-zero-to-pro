# Kafka Cheat Sheet (Windows + WSL)

Быстрая шпаргалка по установке и работе с Apache Kafka 4.3.1 в WSL2 + Python (Anaconda / Jupyter).

---

## Основные понятия

- **Producer** — пишет сообщения в Kafka
- **Consumer** — читает сообщения из Kafka
- **Broker** — сервер, который хранит данные и обслуживает клиентов

---

## 0. Подготовка WSL (делается один раз)

### Проверить, установлен ли WSL

В PowerShell:

```powershell
wsl --list --verbose
```

### Если WSL ещё не установлен

1. Откройте **PowerShell от имени администратора**
2. Выполните:

```powershell
wsl --install
```

3. Перезагрузите компьютер
4. После перезагрузки создайте пользователя и пароль для Ubuntu

### Если WSL уже установлен

Просто запускайте нужный дистрибутив:

```powershell
wsl -d Ubuntu
```

### Полезные команды WSL

| Команда | Что делает |
|--------|------------|
| `wsl --list --verbose` | Показать все установленные дистрибутивы |
| `wsl -d Ubuntu` | Запустить Ubuntu |
| `wsl --set-default Ubuntu` | Сделать Ubuntu дистрибутивом по умолчанию |
| `wsl --shutdown` | Полностью выключить WSL |

---

## 1. Запуск WSL

```powershell
wsl -d Ubuntu
```

---

## 2. Установка Java (если ещё не установлена)

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk
java -version
```

---

## 3. Установка Kafka

```bash
cd ~
wget https://dlcdn.apache.org/kafka/4.3.1/kafka_2.13-4.3.1.tgz -O kafka.tgz
tar -xzf kafka.tgz
mv kafka_2.13-4.3.1 kafka
cd kafka
```

---

## 4. Первичная инициализация (выполняется один раз)

```bash
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
echo $KAFKA_CLUSTER_ID

bin/kafka-storage.sh format --standalone -t $KAFKA_CLUSTER_ID -c config/server.properties
```

---

## 5. Важная настройка для работы из Windows

Узнать текущий IP WSL:

```bash
hostname -I
```

Отредактировать конфигурацию:

```bash
nano config/server.properties
```

Найти строку `advertised.listeners` и заменить на:

```properties
advertised.listeners=PLAINTEXT://ВАШ_IP:9092,CONTROLLER://ВАШ_IP:9093
```

Пример:
```properties
advertised.listeners=PLAINTEXT://172.27.110.36:9092,CONTROLLER://172.27.110.36:9093
```

Сохранить: `Ctrl + O` → Enter → `Ctrl + X`

> **Важно:** IP WSL меняется после перезагрузки компьютера. После каждой перезагрузки нужно обновлять этот параметр.

---

## 6. Запуск Kafka

```bash
cd ~/kafka
bin/kafka-server-start.sh config/server.properties
```

Окно терминала **не закрывать** — пока оно открыто, Kafka работает.

---

## 7. Основные команды CLI

Открыть **новое** окно WSL.

### Список топиков
```bash
bin/kafka-topics.sh --list --bootstrap-server localhost:9092
```

### Создать топик
```bash
bin/kafka-topics.sh --create \
  --topic my-topic \
  --bootstrap-server localhost:9092 \
  --partitions 1 \
  --replication-factor 1
```

### Удалить топик
```bash
bin/kafka-topics.sh --delete --topic my-topic --bootstrap-server localhost:9092
```

### Читать сообщения (console consumer)
```bash
bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --from-beginning
```

### Писать сообщения (console producer)
```bash
bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic my-topic
```

---

## 8. Python-клиенты (Anaconda / Jupyter)

### Установка
```bash
conda activate arrow_env
pip install kafka-python confluent-kafka
```

### Producer (confluent-kafka) — рекомендуется

```python
from confluent_kafka import Producer
import json
import socket

BOOTSTRAP = '172.27.110.36:9092'   # ← ваш актуальный IP WSL
TOPIC = 'my-topic'

producer = Producer({
    'bootstrap.servers': BOOTSTRAP,
    'client.id': socket.gethostname()
})

message = {
    'client_id': 12345,
    'trade_id': 67890,
    'order_sum': 15000
}

producer.produce(
    topic=TOPIC,
    value=json.dumps(message).encode('utf-8')
)
producer.flush()
print("Сообщение отправлено")
```

### Consumer (confluent-kafka)

```python
from confluent_kafka import Consumer

BOOTSTRAP = '172.27.110.36:9092'
TOPIC = 'my-topic'

consumer = Consumer({
    'bootstrap.servers': BOOTSTRAP,
    'group.id': 'my-group',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe([TOPIC])
print("Ожидаю сообщения... (Interrupt Kernel для остановки)")

try:
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print(f"Ошибка: {msg.error()}")
            continue
        print(msg.value().decode('utf-8'))
except KeyboardInterrupt:
    print("\nОстановлено")
finally:
    consumer.close()
```

---

## 9. Полезные советы и частые проблемы

| Проблема | Решение |
|---------|--------|
| Не подключается из Windows / Jupyter | Использовать IP из `hostname -I`, а **не** `localhost` |
| IP изменился после перезагрузки | Обновить `advertised.listeners` + код Python |
| Ошибка `utf-8 codec can't decode byte` в Jupyter | Хранить ноутбуки в папке **без русских букв** |
| Kafka не запускается | Проверить, что Java установлена (`java -version`) |
| Хочу посмотреть сообщения красиво | Можно поднять Kafka UI через Docker (см. ниже) |

---

## 10. (Опционально) Веб-интерфейс Kafka UI

Если установлен Docker:

```bash
docker run -d \
  -p 8080:8080 \
  -e DYNAMIC_CONFIG_ENABLED=true \
  -e KAFKA_CLUSTERS_0_NAME=local \
  -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=172.27.110.36:9092 \
  provectuslabs/kafka-ui:latest
```

Открыть в браузере: [http://localhost:8080](http://localhost:8080)

---

## Краткая последовательность «с нуля»

1. `wsl -d Ubuntu`
2. Установить Java (если нужно)
3. Скачать и распаковать Kafka
4. Один раз сделать `kafka-storage format`
5. Прописать правильный IP в `advertised.listeners`
6. Запустить `kafka-server-start.sh`
7. В Python использовать IP WSL в `bootstrap.servers`

---

*Шпаргалка составлена на основе рабочей конфигурации: Kafka 4.3.1 + WSL2 + Anaconda (arrow_env)*
