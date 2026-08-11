# NiFi: загрузка файлов с FTP

Краткий справочник по рабочему пайплайну ListFTP → FetchFTP → PutFile.

---

## Что делает поток

```
FTP-сервер (test.rebex.net)
        ↓
    ListFTP     — список файлов на сервере
        ↓
    FetchFTP    — скачивание содержимого файла
        ↓
    PutFile     — сохранение на диск в контейнере NiFi
```

Результат: файл `readme.txt` появляется в `/tmp/ftp_downloads` внутри контейнера.

---

## Тестовый FTP-сервер

| Параметр   | Значение          |
|------------|-------------------|
| Host       | `test.rebex.net`  |
| Port       | `21`              |
| Username   | `demo`            |
| Password   | `password`        |
| Remote Path| `/`               |

Публичный read-only FTP для тестов (Rebex).

---

## Процессоры и настройки

### 1. ListFTP

| Property                              | Value            |
|---------------------------------------|------------------|
| Hostname                              | `test.rebex.net` |
| Port                                  | `21`             |
| Username                              | `demo`           |
| Password                              | `password`       |
| Remote Path                           | `/`              |
| Connection Mode                       | `Passive`        |
| Transfer Mode                         | `Binary`         |
| Search Recursively                    | `false`          |
| Ignore Dotted Files                   | `true`           |
| Listing Strategy                      | `timestamps`     |
| Connection Timeout                    | `30 sec`         |
| Data Timeout                          | `30 sec`         |
| Scheduling (Run Schedule)             | `1 min`          |

**Relationships:**
- `success` → соединить с FetchFTP
- `failure` → terminate

---

### 2. FetchFTP

| Property              | Value                |
|-----------------------|----------------------|
| Hostname              | `test.rebex.net`     |
| Port                  | `21`                 |
| Username              | `demo`               |
| Password              | `password`           |
| Remote File           | `${path}/${filename}`|
| Connection Mode       | `Passive`            |
| Completion Strategy   | `None`               |

**Relationships:**
- `success` → соединить с PutFile
- `failure` → terminate
- `comms.failure` → terminate
- `not.found` → terminate

`${path}` и `${filename}` приходят из атрибутов FlowFile, которые выставляет ListFTP.

---

### 3. PutFile

| Property                      | Value                 |
|-------------------------------|-----------------------|
| Directory                     | `/tmp/ftp_downloads`  |
| Create Missing Directories    | `true`                |
| Conflict Resolution Strategy  | `replace`             |

**Relationships:**
- `success` → terminate
- `failure` → terminate

---

## Соединения

```
ListFTP  --success-->  FetchFTP  --success-->  PutFile
```

---

## Проверка

После Start всех трёх процессоров:

```powershell
docker exec -it nifi ls -la /tmp/ftp_downloads
docker exec -it nifi cat /tmp/ftp_downloads/readme.txt
```

Ожидаемый файл: `readme.txt` (~379 байт), текст вида:

```text
Welcome to test.rebex.net!
You are connected to an FTP or SFTP server used for testing purposes
...
```

---

## Ожидаемые цифры в UI

| Процессор | In / Out (примерно)      |
|-----------|--------------------------|
| ListFTP   | Out ≥ 1                  |
| FetchFTP  | In ≥ 1, Out ≥ 1 (~379 B) |
| PutFile   | In ≥ 1                   |

---

## Замечания

- Password в экспорте flow не видно (sensitive-свойство) — задаётся вручную в UI.
- ListFTP по умолчанию опрашивает сервер раз в 1 минуту (`schedulingPeriod: 1 min`).
- Connection Mode = Passive — обычно нужен, если NiFi за NAT/Docker.
- Completion Strategy = `None` — файл на FTP не удаляется и не переименовывается после скачивания.