-- 初始化Roo Code NMOS控制软件的PostgreSQL数据库
-- 创建表结构用于存储NMOS资源清单、连接状态、音频映射和事件规则

-- Nodes表：存储NMOS节点信息
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    nmos_id VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255),
    description TEXT,
    hostname VARCHAR(255),
    api_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices表：存储NMOS设备信息
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    nmos_id VARCHAR(255) UNIQUE NOT NULL,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    label VARCHAR(255),
    description TEXT,
    type VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sources表：存储NMOS源信息
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    nmos_id VARCHAR(255) UNIQUE NOT NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    label VARCHAR(255),
    description TEXT,
    format VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flows表：存储NMOS流信息
CREATE TABLE IF NOT EXISTS flows (
    id SERIAL PRIMARY KEY,
    nmos_id VARCHAR(255) UNIQUE NOT NULL,
    source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    label VARCHAR(255),
    description TEXT,
    format VARCHAR(255),
    media_type VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Senders表：存储NMOS发送者信息
CREATE TABLE IF NOT EXISTS senders (
    id SERIAL PRIMARY KEY,
    nmos_id VARCHAR(255) UNIQUE NOT NULL,
    flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    label VARCHAR(255),
    description TEXT,
    transport VARCHAR(255),
    destination_host VARCHAR(255),
    destination_port INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receivers表：存储NMOS接收者信息
CREATE TABLE IF NOT EXISTS receivers (
    id SERIAL PRIMARY KEY,
    nmos_id VARCHAR(255) UNIQUE NOT NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    label VARCHAR(255),
    description TEXT,
    format VARCHAR(255),
    transport VARCHAR(255),
    subscription_sender_id INTEGER REFERENCES senders(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Connections表：存储连接状态信息
CREATE TABLE IF NOT EXISTS connections (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES senders(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES receivers(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

-- AudioChannels表：存储音频通道信息
CREATE TABLE IF NOT EXISTS audio_channels (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
    channel_index INTEGER NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, channel_index)
);

-- AudioMappings表：存储音频通道映射关系
CREATE TABLE IF NOT EXISTS audio_mappings (
    id SERIAL PRIMARY KEY,
    source_channel_id INTEGER REFERENCES audio_channels(id) ON DELETE CASCADE,
    destination_channel_id INTEGER REFERENCES audio_channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_channel_id, destination_channel_id)
);

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
CREATE INDEX IF NOT EXISTS idx_nodes_nmos_id ON nodes(nmos_id);
CREATE INDEX IF NOT EXISTS idx_devices_nmos_id ON devices(nmos_id);
CREATE INDEX IF NOT EXISTS idx_devices_node_id ON devices(node_id);
CREATE INDEX IF NOT EXISTS idx_sources_nmos_id ON sources(nmos_id);
CREATE INDEX IF NOT EXISTS idx_sources_device_id ON sources(device_id);
CREATE INDEX IF NOT EXISTS idx_flows_nmos_id ON flows(nmos_id);
CREATE INDEX IF NOT EXISTS idx_flows_source_id ON flows(source_id);
CREATE INDEX IF NOT EXISTS idx_senders_nmos_id ON senders(nmos_id);
CREATE INDEX IF NOT EXISTS idx_senders_flow_id ON senders(flow_id);
CREATE INDEX IF NOT EXISTS idx_receivers_nmos_id ON receivers(nmos_id);
CREATE INDEX IF NOT EXISTS idx_receivers_device_id ON receivers(device_id);
CREATE INDEX IF NOT EXISTS idx_connections_sender_id ON connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_audio_channels_flow_id ON audio_channels(flow_id);
CREATE INDEX IF NOT EXISTS idx_audio_mappings_source_channel_id ON audio_mappings(source_channel_id);
CREATE INDEX IF NOT EXISTS idx_audio_mappings_destination_channel_id ON audio_mappings(destination_channel_id);
CREATE INDEX IF NOT EXISTS idx_event_rules_event_type_id ON event_rules(event_type_id);
CREATE INDEX IF NOT EXISTS idx_event_rules_source_id ON event_rules(source_id);

COMMENT ON TABLE nodes IS 'NMOS节点信息';
COMMENT ON TABLE devices IS 'NMOS设备信息';
COMMENT ON TABLE sources IS 'NMOS源信息';
COMMENT ON TABLE flows IS 'NMOS流信息';
COMMENT ON TABLE senders IS 'NMOS发送者信息';
COMMENT ON TABLE receivers IS 'NMOS接收者信息';
COMMENT ON TABLE connections IS 'NMOS连接状态信息';
COMMENT ON TABLE audio_channels IS '音频通道信息';
COMMENT ON TABLE audio_mappings IS '音频通道映射关系';
COMMENT ON TABLE event_types IS '事件类型信息';
COMMENT ON TABLE event_rules IS '事件规则信息';