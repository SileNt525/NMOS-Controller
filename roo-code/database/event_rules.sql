-- 事件规则表结构

-- EventTypes表：存储事件类型信息
CREATE TABLE IF NOT EXISTS event_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EventRules表：存储事件规则信息
CREATE TABLE IF NOT EXISTS event_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_type_id INTEGER REFERENCES event_types(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_event_rules_event_type_id ON event_rules(event_type_id);
CREATE INDEX IF NOT EXISTS idx_event_rules_source_id ON event_rules(source_id);

COMMENT ON TABLE event_types IS '事件类型信息';
COMMENT ON TABLE event_rules IS '事件规则信息';