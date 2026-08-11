
# Практическая работа - Внешние таблицы
## Цель практического задания: Освоить основы работы с внешними таблицами в среде Docker с использованием Hive.
## Что входит в задание:
В данном задании вы будете работать с внешними таблицами в среде Docker, используя инструмент Hive. Вам потребуется установить Docker Desktop for Windows, скачать репозиторий docker-hive, запустить контейнер Hive и выполнить ряд операций с данными.
## Шаги выполнения практической работы:
1. Скачать и установить Docker Desktop for Windows - https://www.docker.com/products/docker-desktop/
2. Скачать репозиторий - git clone https://github.com/big-data-europe/docker-hive.git
3. Перейти в папку docker-hive - `cd docker-hive` и запустить `docker-compose up -d`
4. Перейти в контейнер Hive - `docker-compose exec hive-server bash`
5. Скачать датасет по по аэропортам - `curl -L https://datahub.io/core/airport-codes/r/0.csv > airports.csv -k`
6. Загрузить данные в HDFS - `hdfs dfs -put airports.csv /user/hive/warehouse/`
7. Проверить, что данные загрузились - `hdfs dfs -ls /user/hive/warehouse/`
    ````shell
   drwxr-xr-x   - root supergroup          0 2023-06-10 21:53 /user/hive/warehouse/airports
   -rw-r--r--   3 root supergroup    6232459 2023-06-11 09:12 /user/hive/warehouse/airports.csv
   drwxrwxr-x   - root supergroup          0 2023-06-10 21:46 /user/hive/warehouse/pokes

8. Запустить Hive - `hive`
9. Создать базу данных - `create database your_name_db;`
10. Проверить, что база данных создалась - `show databases;`
    ````shell
    hive> show databases;
    OK
    default
    ivan_ivanov_db
    Time taken: 0.269 seconds, Fetched: 2 row(s)`
11. Проверить, таблицы - `show tables;`
12. Создать внешнюю таблицу в формате CSV:
    ````sql
    CREATE EXTERNAL TABLE your_name_db.airports (
    ident STRING,
    type STRING,
    name STRING,
    elevation_ft STRING,
    continent STRING,
    iso_country STRING,
    iso_region STRING,
    municipality STRING,
    gps_code STRING,
    iata_code STRING,
    local_code STRING,
    coordinates STRING)
    ROW FORMAT DELIMITED
    FIELDS TERMINATED BY ','
    STORED AS TEXTFILE
    LOCATION '/user/hive/warehouse/airports'
    tblproperties("skip.header.line.count"="1");
    ````
14. Проверить, что таблица создалась
    ````sql 
    set hive.cli.print.current.db=true;
    set hive.cli.print.header=true;
    use your_name_db;
    show tables;
15. Проверить, что данные загрузились
    ````sql
    select * from your_name_db.airports limit 10;


# Практическая работа: Managed таблицы
# Цель практического задания: состоит в создании и управлении Managed таблицей в формате ORC в Hive. 
## Что входит в задание:
В ходе выполнения задания необходимо создать новую Managed таблицу "airports_orc" в базе данных "your_name_db" на основе данных из таблицы "airports". Затем следует проверить успешное создание таблицы с помощью команды "show tables". После этого необходимо убедиться, что данные были загружены в таблицу с помощью запроса "select * from your_name_db.airports_orc limit 10". Далее следует удалить внешнюю таблицу "airports" и проверить, что она была удалена с помощью команды "show tables". После выхода из интерфейса командной строки Hive (Hive CLI) необходимо проверить, что данные остались на HDFS с помощью команды "hdfs dfs -ls /user/hive/warehouse/". При успешном выполнении задания ожидается, что таблица будет создана, данные будут загружены, внешняя таблица будет удалена, и данные останутся на HDFS.

## Шаги выполнения практической работы:
1. Создать Managed таблицу в формате ORC:
    ````sql
    CREATE TABLE your_name_db.airports_orc
    STORED AS ORC
    AS SELECT * FROM your_name_db.airports;
    ````
1. Проверить, что таблица создалась
   ````sql
    show tables;
1. Проверить, что данные загрузились
   ````sql
   select * from your_name_db.airports_orc limit 10;
1. Удалить внешнюю таблицу
    ````sql
    drop table your_name_db.airports;
1. Проверить, что таблица удалилась -
   ````sql
   show tables;
1. Выйти из hive cli и проверить, что данные остались на hdfs 
    ````sql
   hdfs dfs -ls /user/hive/warehouse/
1. В консоли Вы увидите следующее:
    ````shell
    root@17dad4b20a05:/opt# hdfs dfs -ls /user/hive/warehouse/
    Found 4 items
    drwxr-xr-x   - root supergroup          0 2023-06-10 21:53 /user/hive/warehouse/airports
    -rw-r--r--   3 root supergroup    6232459 2023-06-11 09:12 /user/hive/warehouse/airports.csv
    drwxrwxr-x   - root supergroup          0 2023-06-10 21:46 /user/hive/warehouse/pokes
    drwxrwxr-x   - root supergroup          0 2023-06-11 22:18 /user/hive/warehouse/your_name_db.db


# Практическая работа - Партиционирование
## Цель практического задания заключается в создании партиционированной таблицы в формате ORC в Hive и выполнении операций с партициями.
## Что входит в задание:
В рамках задания необходимо выполнить следующие шаги: зайти в интерфейс командной строки Hive (Hive CLI); создать партиционированную таблицу "airports_orc_part" в базе данных "your_name_db" с указанными столбцами и разделителем партиций "type"; проверить успешное создание таблицы с помощью команды "show tables"; проверить наличие партиций с помощью команды "show partitions your_name_db.airports_orc_part"; загрузить данные в партиционированную таблицу из существующей таблицы "airports_orc"; проверить успешную загрузку данных с помощью запроса "select * from your_name_db.airports_orc_part limit 10"; проверить наличие партиций после загрузки данных с помощью команды "show partitions your_name_db.airports_orc_part"; удалить партиционированную таблицу с помощью команды "drop table your_name_db.airports_orc_part"; проверить успешное удаление таблицы с помощью команды "show tables"; выйти из интерфейса командной строки Hive (Hive CLI) и проверить, что данные остались на HDFS с помощью команды "hdfs dfs -ls /user/hive/warehouse/". В результате выполнения задания ожидается, что партиционированная таблица будет создана, данные будут успешно загружены, партиции будут отображены, таблица будет удалена, и данные останутся на HDFS.
## Шаги выполнения практической работы:
1. Зайти в hive cli - `hive`
1. Создать партиционированную таблицу в формате ORC:
    ````sql
    set hive.exec.dynamic.partition.mode=nonstrict;
    set hive.exec.dynamic.partition=true;
    set hive.exec.max.dynamic.partitions=100000;
    set hive.exec.max.dynamic.partitions.pernode=100000;

    CREATE TABLE your_name_db.airports_orc_part (
    ident STRING,
    name STRING,
    elevation_ft STRING,
    continent STRING,
    iso_country STRING,
    iso_region STRING,
    municipality STRING,
    gps_code STRING,
    iata_code STRING,
    local_code STRING,
    coordinates STRING)
    PARTITIONED BY (type STRING)
    STORED AS ORC;
    ````

1. Проверить, что таблица создалась
    ````sql
    set hive.cli.print.current.db=true;
    set hive.cli.print.header=true;
    use your_name_db;
    show tables; 
1. Ожидаемый результат:
    ````shell
    hive (your_name_db)>     show tables;
    OK
    tab_name
    airports_orc
    airports_orc_part
    Time taken: 0.269 seconds, Fetched: 2 row(s)
   
1. Проверить партиции - `show partitions your_name_db.airports_orc_part;`
1. Загрузить данные в партиционированную таблицу 
    ````sql
    INSERT OVERWRITE TABLE your_name_db.airports_orc_part PARTITION (type)
    SELECT ident, name, elevation_ft, continent, iso_country, iso_region, municipality, gps_code, iata_code, local_code, coordinates, type FROM your_name_db.airports_orc;
    ````
1. Проверить, что данные загрузились - `select * from your_name_db.airports_orc_part limit 10;`
1. Проверить партиции - `show partitions your_name_db.airports_orc_part;`
1. Ожидаемый результат:
    ````shell
    hive (your_name_db)> show partitions your_name_db.airports_orc_part;
    OK
    type=balloonport
    type=closed
    type=heliport
    type=large_airport
    type=medium_airport
    type=seaplane_base
    type=small_airport
    Time taken: 0.269 seconds, Fetched: 7 row(s)
1. Удалить managed таблицу
    ````sql
    drop table your_name_db.airports_orc_part;
1. Проверить, что таблица удалилась 
    ````sql
    show tables;
1. Выйти из hive cli и проверить, что данные остались на hdfs 
    ````shell
   hdfs dfs -ls /user/hive/warehouse/
2. Ожидаемый результат:
    ````shell
    root@17dad4b20a05:/opt# hdfs dfs -ls /user/hive/warehouse/
    Found 4 items
    drwxr-xr-x   - root supergroup          0 2023-06-10 21:53 /user/hive/warehouse/airports
    -rw-r--r--   3 root supergroup    6232459 2023-06-11 09:12 /user/hive/warehouse/airports.csv
    drwxrwxr-x   - root supergroup          0 2023-06-10 21:46 /user/hive/warehouse/pokes
    drwxrwxr-x   - root supergroup          0 2023-06-11 22:18 /user/hive/warehouse/your_name_db.db



# Практическая работа - Бакетирование
## Цель практического задания заключается в создании таблицы в формате ORC с бакетированием данных по полю "ident" в Hive и выполнении операций с бакетами. 
## Что входит в задание: 
В рамках задания необходимо выполнить следующие шаги: создать новую таблицу "airports_orc_bucketed" в базе данных "your_name_db" с указанными столбцами и бакетированием по полю "ident" на 3 бакета; проверить успешное создание таблицы с помощью команды "show tables"; загрузить данные в бакетированную таблицу из существующей таблицы "airports_orc"; проверить успешную загрузку данных с помощью запроса "select * from your_name_db.airports_orc_bucketed limit 10"; выйти из интерфейса командной строки Hive (Hive CLI) и проверить, что файлы разбились на бакеты с помощью команды "hdfs dfs -ls /user/hive/warehouse/your_name_db.db/airports_orc_bucketed/". Ожидается, что таблица с бакетированием будет создана, данные будут успешно загружены, и файлы будут разбиты на соответствующее количество бакетов на HDFS.
## Шаги выполнения практической работы:
1. Создать еще одну таблицу в формате ORC с бакетированием по полю ident:
    ````sql
    set hive.enforce.bucketing=true;
    set hive.exec.dynamic.partition.mode=nonstrict;
    set hive.exec.dynamic.partition=true;
    set hive.exec.max.dynamic.partitions=100000;
    
    CREATE TABLE your_name_db.airports_orc_bucketed (
    ident STRING,
    type STRING,
    name STRING,
    elevation_ft STRING,
    continent STRING,
    iso_country STRING,
    iso_region STRING,
    municipality STRING,
    gps_code STRING,
    iata_code STRING,
    local_code STRING,
    coordinates STRING)
    CLUSTERED BY (ident) INTO 3 BUCKETS
    STORED AS ORC;
    ````
1. Проверить, что таблица создалась - `show tables;`
1. Загрузить данные в таблицу с бакетированием
    ````sql
    INSERT OVERWRITE TABLE your_name_db.airports_orc_bucketed
    SELECT ident, 
        type, 
        name, 
        elevation_ft, 
        continent, 
        iso_country, 
        iso_region, 
        municipality, 
        gps_code, 
        iata_code, 
        local_code, 
        coordinates 
    FROM your_name_db.airports_orc;
    ````
1. Проверить, что данные загрузились
    ````sql
    select * from your_name_db.airports_orc_bucketed limit 10;
    ````
1. Выйти из hive cli `ctrl + c` и проверить, что файлы разбились на бакеты 
    ````shell
    hdfs dfs -ls /user/hive/warehouse/your_name_db.db/airports_orc_bucketed/
    ````
1. Ожидаемый результат:
    ````shell
    root@17dad4b20a05:/opt# hdfs dfs -ls /user/hive/warehouse/your_name_db.db/airports_orc_bucketed/
    Found 4 items
    -rw-r--r--   3 root supergroup          0 2023-06-11 22:18 /user/hive/warehouse/your_name_db.db/airports_orc_bucketed/000000_0
    -rw-r--r--   3 root supergroup          0 2023-06-11 22:18 /user/hive/warehouse/your_name_db.db/airports_orc_bucketed/000001_0
    -rw-r--r--   3 root supergroup          0 2023-06-11 22:18 /user/hive/warehouse/your_name_db.db/airports_orc_bucketed/000002_0
    ````   
1. Выйти из контейнера `exit`   



# Практическая работа - Metastore
## Цель практического задания заключается в проверке, что данные о таблицах хранятся в metastore.
## Что входит в задание:
В ходе задания необходимо выполнить следующие шаги: просмотреть содержимое metastore с помощью команд внутри контейнера "hive-metastore-postgresql"; войти в контейнер с помощью команды "docker-compose exec hive-metastore-postgresql bash" и выполнить команду "psql" для подключения к базе данных metastore и выполнения SQL-запроса "select * from TBLS"; выйти из контейнера; перейти в интерфейс командной строки Hive CLI, используя команду "docker-compose exec hive-server bash" и затем "hive"; удалить таблицу "airports_orc_bucketed" с помощью команды "drop table your_name_db.airports_orc_bucketed"; проверить, что таблица была удалена с помощью команды "show tables"; проверить, что данные также были удалены с HDFS, используя команду "hdfs dfs -ls /user/hive/warehouse/"; проверить, что данные были удалены из metastore, войдя в контейнер "hive-metastore-postgresql" и выполнив команду "psql" для подключения к базе данных metastore и выполнения SQL-запроса "select * from TBLS". Ожидается, что metastore будет доступен, таблица будет успешно удалена, данные будут удалены из HDFS и metastore соответственно.
## Шаги выполнения практической работы:
1. Посмотреть metastore 
    ````shell
    docker-compose exec hive-metastore-postgresql bash
    psql -d metastore --username=hive
    select * from TBLS;
    ````
1. Выйти из контейнера `exit`
1. Перейти в hive cli `docker-compose exec hive-server bash` `hive`
1. Удалить таблицу
    ````shell
    drop table your_name_db.airports_orc_bucketed;
1. Проверить, что таблица удалилась - `show tables;`
1. Проверить, что данные тоже удалились с hdfs
    ````shell
    hdfs dfs -ls /user/hive/warehouse/
1. Проверить, что данные удалились с metastore 
    ````shell
    docker-compose exec hive-metastore-postgresql bash
    psql -d metastore --username=hive
    select * from TBLS;


# Практическая работа - DML и Запросы
## Цель практического задания заключается в выполнении различных DML-запросов и запросов на выборку данных из таблицы "airports_orc_part" в Hive. В ходе задания необходимо выполнить следующие шаги:
## Что входит в задание: Написание различных запросов
1. Сделать выборку из таблицы airports_orc_part по полю type = 'large_airport' и отсортировать по полю elevation_ft по убыванию
    ````sql
        
        select * 
        from your_name_db.airports_orc 
        where type = 'large_airport' 
        order by elevation_ft desc 
        limit 10;
    ````
2. Сделать выборку из таблицы airports_orc_part по полю type = 'large_airport' и отсортировать по полю elevation_ft по возрастанию
    ````sql
        select * 
        from your_name_db.airports_orc 
        where type = 'large_airport' 
        order by elevation_ft 
        limit 10;
    ````
3. Сделать выборку из таблицы airports_orc_part по полю type = 'large_airport' и сгруппировать по полю continent
    ````sql
        select continent, count(*) 
        from your_name_db.airports_orc 
        where type = 'large_airport' 
        group by continent;
    ````

5. Сделать выборку из таблицы airports_orc_part по полю type = 'large_airport' и посчитать количество записей для каждого значения поля continent, отсортировать по убыванию количества записей
    ````sql
        select 
            continent, 
            count(*) as cnt 
        from your_name_db.airports_orc 
        where type = 'large_airport' 
        group by continent 
        order by cnt desc;
    ````
6. Сделать выборку из таблицы airports_orc_part и посчитать среднее значение поля elevation_ft для каждого значения поля continent, отсортировать по убыванию среднего значения
    ````sql
        select 
            continent, 
            avg(elevation_ft) as avg_elevation_ft 
        from your_name_db.airports_orc 
        group by continent 
        order by avg_elevation_ft desc;
    ````   
7. Сделать выборку из таблицы airports_orc_part и посчитать среднее значение поля elevation_ft для каждого значения поля continent, отсортировать по возрастанию среднего значения
    ````sql
        with t as (
            select continent, avg(elevation_ft) as avg_elevation_ft
            from your_name_db.airports_orc 
            group by continent
        ) 
    select * from t order by avg_elevation_ft;
    ````   
   
8. Сделать выборку из таблицы airports_orc_part и посчитать среднее значение поля elevation_ft для каждого значения поля continent, отсортировать по возрастанию среднего значения, но вывести только те записи, у которых среднее значение больше 1000
    ````sql
    select * from (select continent, avg(elevation_ft) as avg_elevation_ft
            from your_name_db.airports_orc 
            group by continent) as t
    where avg_elevation_ft > 1000 
    order by avg_elevation_ft;
    ````