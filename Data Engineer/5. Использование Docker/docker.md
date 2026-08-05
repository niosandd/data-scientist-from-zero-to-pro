# Docker — базовая настройка и правильная работа

Краткий справочник по корректной работе с Docker.  
Только общие принципы и команды, которые используются на практике.

---

## 1. Проверка, что Docker установлен

```powershell
docker --version
docker compose version
```

Если команды не находятся — установите [Docker Desktop](https://www.docker.com/products/docker-desktop/).

После установки Docker Desktop должен быть **запущен** (иконка в трее).

---

## 2. Основные понятия

| Понятие | Что это |
|---------|---------|
| **Image** | Шаблон (образ) приложения |
| **Container** | Запущенный экземпляр образа |
| **Volume** | Постоянное хранилище данных |
| **Network** | Сеть, через которую контейнеры видят друг друга |
| **Port mapping** | Проброс порта контейнера на хост (`-p`) |

---

## 3. Базовые команды

### Список запущенных контейнеров

```powershell
docker ps
```

Все контейнеры (включая остановленные):

```powershell
docker ps -a
```

### Логи

```powershell
docker logs <имя_или_id>
docker logs <имя> --tail 50
docker logs -f <имя>          # следить в реальном времени
```

### Зайти внутрь контейнера

```powershell
docker exec -it <имя> bash
# или
docker exec -it <имя> sh
```

### Остановить / запустить / удалить

```powershell
docker stop <имя>
docker start <имя>
docker restart <имя>
docker rm <имя>               # удалить остановленный
docker rm -f <имя>            # принудительно удалить
```

### Список образов

```powershell
docker images
docker rmi <образ>            # удалить образ
```

---

## 4. Запуск контейнера (docker run)

Базовый шаблон:

```powershell
docker run --name my-app `
  -p 8080:80 `
  -d `
  -e MY_VAR=value `
  my-image:latest
```

| Флаг | Назначение |
|------|------------|
| `--name` | Имя контейнера |
| `-p host:container` | Проброс порта |
| `-d` | Запуск в фоне (detached) |
| `-e KEY=VALUE` | Переменная окружения |
| `-v host_path:container_path` | Монтирование папки/тома |
| `--rm` | Удалить контейнер после остановки |

Пример проверки:

```powershell
docker ps
docker logs my-app
```

---

## 5. Docker Compose (рекомендуемый способ)

Когда нужно несколько сервисов или просто удобнее управлять — используйте `docker-compose.yml`.

### Подготовка

```powershell
mkdir C:\my-project
cd C:\my-project
```

Создайте файл `docker-compose.yml`:

```yaml
services:
  app:
    image: my-image:latest
    container_name: my-app
    ports:
      - "8080:80"
    environment:
      MY_VAR: value
    restart: unless-stopped
```

### Запуск

```powershell
docker compose up -d
```

### Проверка

```powershell
docker compose ps
docker ps
```

### Остановка

```powershell
docker compose down          # остановить и удалить контейнеры
docker compose down -v       # + удалить volumes (полный сброс)
```

### Перезапуск одного сервиса

```powershell
docker compose restart app
```

### Логи

```powershell
docker compose logs
docker compose logs app
docker compose logs -f app
```

---

## 6. Сеть: контейнер ↔ хост

### Из контейнера к сервисам на Windows

Используйте специальный адрес:

```
host.docker.internal
```

Примеры:

| Цель | Адрес из контейнера |
|------|---------------------|
| MongoDB на Windows | `host.docker.internal:27017` |
| Любой сервис на хосте | `host.docker.internal:<порт>` |

### Между контейнерами одной сети

В `docker-compose.yml` сервисы видят друг друга **по имени сервиса**:

```yaml
services:
  db:
    image: mongo
  app:
    image: my-app
    depends_on:
      - db
```

Внутри `app` подключаться к базе как `db:27017`, а не `localhost`.

> **Важно:** внутри Docker-сети всегда используйте **имя сервиса**, а не `localhost`.

---

## 7. Полезные команды на каждый день

```powershell
# Статус
docker ps

# Логи
docker logs <имя> --tail 100

# Зайти внутрь
docker exec -it <имя> bash

# Остановить всё, что запущено compose
docker compose down

# Полная очистка неиспользуемых ресурсов
docker system prune
```

---

## 8. Типичные ошибки

| Проблема | Решение |
|----------|---------|
| `docker: command not found` | Docker Desktop не установлен или не запущен |
| Порт уже занят | Смените `-p` или остановите процесс, который занимает порт |
| Контейнер сразу падает | Смотрите `docker logs <имя>` |
| Не видит сервис на хосте | Используйте `host.docker.internal`, а не `localhost` |
| `no configuration file provided` | Запускайте `docker compose` из папки, где лежит `docker-compose.yml` |
| Контейнеры не видят друг друга | Проверьте, что они в одной сети (в compose — по умолчанию да) |

---

## 9. Рекомендуемый порядок работы

1. Убедиться, что Docker Desktop запущен.
2. Создать папку проекта.
3. Написать `docker-compose.yml`.
4. Запустить: `docker compose up -d`.
5. Проверить: `docker ps` и `docker logs`.
6. При необходимости зайти внутрь: `docker exec -it ...`.
7. Остановить: `docker compose down`.

---

## Краткая шпаргалка

```powershell
# Старт
cd C:\my-project
docker compose up -d

# Проверка
docker ps
docker logs <имя>

# Внутрь контейнера
docker exec -it <имя> bash

# Остановка
docker compose down

# Полный сброс
docker compose down -v
```
