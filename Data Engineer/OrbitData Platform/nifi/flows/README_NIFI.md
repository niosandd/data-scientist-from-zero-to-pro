# NiFi Flow для OrbitData

## Flow: Kafka → Bronze (альтернатива Python consumer)

### роцессоры

1. **ConsumeKafka_2_6**
   - Kafka Brokers: `kafka:9092`
   - Topic Name: `banking.transactions,space.iss.position,industrial.sensors`
   - Group ID: `nifi-bronze-group`

2. **EvaluateJsonPath**
   - звлекаем `domain` → атрибут `domain`

3. **UpdateAttribute**
   - `filename` = `${domain}_${now():format('yyyyMMdd_HHmmss')}.json`

4. **PutFile**
   - Directory: `/data/bronze/nifi/${domain}`
   - Create Missing Directories: true

### ак запустить

1. ткрыть http://localhost:8080
2. огин: admin / admin1234567890
3. Создать Process Group `OrbitData-Ingestion`
4. обавить процессоры по списку выше
5. Соединить и Start

то демонстрирует альтернативный путь ingestion через NiFi.
