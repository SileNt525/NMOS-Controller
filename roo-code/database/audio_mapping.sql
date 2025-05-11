-- 音频通道映射表结构

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

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_audio_channels_flow_id ON audio_channels(flow_id);
CREATE INDEX IF NOT EXISTS idx_audio_mappings_source_channel_id ON audio_mappings(source_channel_id);
CREATE INDEX IF NOT EXISTS idx_audio_mappings_destination_channel_id ON audio_mappings(destination_channel_id);

COMMENT ON TABLE audio_channels IS '音频通道信息';
COMMENT ON TABLE audio_mappings IS '音频通道映射关系';