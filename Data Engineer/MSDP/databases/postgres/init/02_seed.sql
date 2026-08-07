INSERT INTO raw.events (event_type, payload) VALUES
('purchase', '{"order_id": 1001, "amount": 1500, "currency": "RUB"}'),
('purchase', '{"order_id": 1002, "amount": 2300, "currency": "RUB"}'),
('click',    '{"page": "/catalog", "user_id": 42}'),
('purchase', '{"order_id": 1003, "amount": 890, "currency": "RUB"}'),
('login',    '{"user_id": 42, "method": "email"}');