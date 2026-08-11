## Партицирование в GP

#### Цель:
Цель этой лабораторной работы - ознакомить участников с концепцией и практикой разбиения таблиц в Greenplum. С помощью практических упражнений учащиеся создадут разделенные таблицы, поймут стратегии разбиения и проверят конфигурации разбиений.

#### Требования:
- Доступ к экземпляру базы данных Greenplum
- Базовые знания SQL

#### Этапы:

1. **Настройка среды**:
    - Убедитесь, что у вас есть доступ к базе данных Greenplum.
    - Откройте клиент базы данных, который позволяет выполнять SQL-команды.

2. **Создание таблицы продаж**:
    - Выполните следующие SQL-команды для удаления существующей таблицы `sales`, если она существует, и создания новой разделенной таблицы `sales` на основе диапазонов дат:
      ```sql
      DROP TABLE IF EXISTS sales;
      CREATE TABLE sales(
          sale_id SERIAL,
          sale_date DATE,
          amount DECIMAL
      ) PARTITION BY RANGE (sale_date)
      ( PARTITION p1 START ('2023-01-01') END ('2023-06-30'),
        PARTITION p2 START ('2023-07-01') END ('2023-12-31')
      );
      ```

3. **Проверка разделов таблицы продаж**:
    - Выполните следующий SQL-запрос, чтобы просмотреть разделы таблицы `sales`:
      ```sql
      SELECT
          n.nspname AS schemaname,
          c.relname AS tablename,
          c2.relname AS partitionname,
          pg_catalog.pg_get_expr(c2.relpartbound, c2.oid) AS partition_expression
      FROM
          pg_class c
      JOIN
          pg_inherits i ON c.oid = i.inhparent
      JOIN
          pg_class c2 ON i.inhrelid = c2.oid
      JOIN
          pg_namespace n ON c.relnamespace = n.oid
      WHERE
          c.relname = 'sales' AND n.nspname = 'public';
      ```

4. **Создание таблицы заказов**:
    - Выполните SQL-команды для удаления существующей таблицы `orders`, если она существует, и создания новой разделенной таблицы `orders` на основе категорий продуктов:
      ```sql
      DROP TABLE IF EXISTS orders;
      CREATE TABLE orders (
          order_id SERIAL,
          product_category TEXT,
          order_date DATE
      ) PARTITION BY LIST (product_category)
      ( PARTITION p1 VALUES ('Electronics', 'Clothing'));
      ```

5. **Проверка разделов таблицы заказов**:
    - Выполните следующий SQL-запрос, чтобы просмотреть разделы таблицы `orders`:
      ```sql
      SELECT
          n.nspname AS schemaname,
          c.relname AS tablename,
          c2.relname AS partitionname,
          pg_catalog.pg_get_expr(c2.relpartbound, c2.oid) AS partition_expression
      FROM
          pg_class c
      JOIN
          pg_inherits i ON c.oid = i.inhparent
      JOIN
          pg_class c2 ON i.inhrelid = c2.oid
      JOIN
          pg_namespace n ON c.relnamespace = n.oid
      WHERE
          c.relname = 'orders' AND n.nspname = 'public';
      ```

#### Самопроверка:

- **Проверка создания таблиц**: После выполнения SQL-команд по созданию таблиц используйте команду `\dt`, чтобы перечислить все таблицы и убедиться, что `sales` и `orders` присутствуют.
- **Проверка разделов**: Используйте предоставленные SQL-запросы для получения и проверки деталей разделов. Убедитесь, что разделы созданы в соответствии с командами создания таблиц.
- **Вставка тестовых данных**: При желании вы можете вставить тестовые данные в обе таблицы и использовать SQL-запросы `SELECT`, чтобы убедиться, что данные направлены в правильные разделы.

Завершив эту лабораторную работу, участники получат практический опыт разбиения таблиц в Greenplum, что улучшит производительность и управление большими наборами данных.
