# NiFi + MongoDB: установка и запуск с нуля

## Что получится

```
GenerateFlowFile → PutMongo → MongoDB (локально)
```

NiFi работает в Docker, MongoDB — на Windows.

---

## 1. Установка Docker

1. Скачай Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Установи и перезагрузи компьютер.
3. Запусти Docker Desktop и дождись статуса **Running**.

Проверка в PowerShell:

```powershell
docker --version
```

---

## 2. Установка и запуск MongoDB

1. Установи MongoDB Community:
   https://www.mongodb.com/try/download/community
2. Запусти службу MongoDB (обычно стартует сама).
3. Проверка:

```python
from pymongo import MongoClient
print(MongoClient("mongodb://localhost:27017/").list_database_names())
```

Должны быть как минимум `admin`, `local`.

---

## 3. Запуск NiFi в Docker

В PowerShell:

```powershell
docker run --name nifi `
  -p 8443:8443 `
  -d `
  -e SINGLE_USER_CREDENTIALS_USERNAME=admin `
  -e SINGLE_USER_CREDENTIALS_PASSWORD=admin123456789 `
  apache/nifi:latest
```

Подожди 1–2 минуты.

Проверка:

```powershell
docker ps
```

Контейнер `nifi` должен быть в статусе **Up**.

---

## 4. Вход в NiFi

1. Открой браузер: **https://localhost:8443/nifi**
2. Если предупреждение о сертификате → «Дополнительно» → перейти на сайт.
3. Логин / пароль:
   - **Username:** `admin`
   - **Password:** `admin123456789`

---

## 5. Создание MongoDB Controller Service

1. Правой кнопкой на **пустом месте** холста → **Configure**.
2. Вкладка **Controller Services** → **+**.
3. Найди `MongoDBControllerService` → **Add**.
4. Шестерёнка (Configure) → Properties:

| Property | Value |
|----------|--------|
| Mongo URI | `mongodb://host.docker.internal:27017` |

5. **Apply**.
6. Слева нажми **Enable** (статус станет зелёным).

> `host.docker.internal` — так Docker обращается к MongoDB на Windows.

---

## 6. Создание процессоров

Добавь на холст:

1. `GenerateFlowFile`
2. `PutMongo`

Соедини стрелкой:

```
GenerateFlowFile → PutMongo
```

Relationship: **success**.

---

## 7. Настройка GenerateFlowFile

Двойной клик → **Properties**:

| Property | Value |
|----------|--------|
| Custom Text | `{"exchange":"NiFiTest","volume_1":10.5,"volume_2":12.1,"volume_3":9.8,"volume_4":11.0,"volume_5":8.4,"volume_6":7.2}` |

**Relationships:**
- `success` — не terminate (уже соединён)
- остальные — **terminate**

**Scheduling** (по желанию):
- Run Schedule: `5 sec`

**Apply**.

---

## 8. Настройка PutMongo

**Properties:**

| Property | Value |
|----------|--------|
| Mongo Controller Service | выбери созданный сервис |
| Database Name | `coingecko` |
| Collection Name | `nifi_exchanges` |
| Mode | `insert` |

**Relationships:**
- `success` → **terminate**
- `failure` → **terminate**

**Apply**.

---

## 9. Запуск потока

1. Выдели оба процессора.
2. Правой кнопкой → **Start** (или зелёная кнопка сверху).

Оба должны стать **зелёными**.

Через несколько секунд:
- GenerateFlowFile: **Out > 0**
- PutMongo: **In > 0**

---

## 10. Проверка MongoDB

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
col = client["coingecko"]["nifi_exchanges"]

print("Документов:", col.count_documents({}))
for doc in col.find({}, {"_id": 0}):
    print(doc)
```

Ожидается документ вида:

```json
{
  "exchange": "NiFiTest",
  "volume_1": 10.5,
  "volume_2": 12.1,
  "volume_3": 9.8,
  "volume_4": 11.0,
  "volume_5": 8.4,
  "volume_6": 7.2
}
```

---

## Как это работает

GenerateFlowFile создаёт FlowFile с JSON-содержимым и по связи success передаёт его в PutMongo. PutMongo сам не хранит адрес MongoDB — он обращается к MongoDBControllerService, который знает, куда подключаться, устанавливает соединение с базой и вставляет документ в указанную коллекцию. Таким образом, процессор отвечает только за запись данных, а все настройки подключения сосредоточены в одном общем контроллере.

---

## Процессор vs Controller Service

| | Процессор | Controller Service |
|--|-----------|-------------------|
| Что делает | Обрабатывает FlowFile | Хранит общую настройку (URI, логин и т.д.) |
| Пример | `PutMongo`, `GenerateFlowFile` | `MongoDBControllerService` |
| Сколько раз настраивается | На каждом процессоре | Один раз на всю среду |

**Без контроллера:** URI прописывается в каждом процессоре отдельно.  
**С контроллером:** URI задаётся один раз, все процессоры его используют.

---

## Полезные команды

| Действие | Команда |
|----------|---------|
| Статус NiFi | `docker ps` |
| Логи NiFi | `docker logs nifi` |
| Остановить NiFi | `docker stop nifi` |
| Запустить снова | `docker start nifi` |
| Удалить контейнер | `docker rm -f nifi` |

---

## Краткая схема

```
Windows:
  MongoDB  ←── host.docker.internal:27017 ──  NiFi (Docker)
                                                    ↑
                                            GenerateFlowFile
```

1. Docker Desktop запущен  
2. MongoDB запущена на `localhost:27017`  
3. NiFi-контейнер на порту `8443`  
4. Controller Service указывает на `host.docker.internal:27017`  
5. GenerateFlowFile → PutMongo → данные в MongoDB  
```