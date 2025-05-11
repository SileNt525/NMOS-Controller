# Roo Code 数据库设计

Roo Code 是一个基于NMOS标准的控制系统，用于IP广播设备的路由控制。本目录包含数据库设计和相关脚本，用于存储和管理NMOS资源和系统配置。

## 数据库目标

- **NMOS资源清单**：存储Node、Device、Sender、Receiver、Source、Flow及其关系。
- **连接状态**：持久化期望/暂存的连接和活动连接状态。
- **用户配置**：存储用户偏好、自定义视图、已保存的路由配置。
- **IS-07事件规则**：如果可配置，存储事件触发动作的规则。
- **标识符持久性**：存储NMOS资源的持久性UUID作为主键。

## 技术栈

- 主要数据库：PostgreSQL，用于结构化数据存储。
- 缓存数据库：Redis，用于频繁访问的数据和会话管理。
- 可选时序数据库：InfluxDB或Prometheus，用于历史事件记录或性能监控。

## 开发计划

按照分阶段方法，第一阶段将设计基础数据库模式，用于IS-04资源和简单连接状态的存储。

## 已创建文件和使用指南

- **init.sql**：初始化PostgreSQL数据库的脚本文件，包含NMOS资源清单和连接状态的表结构定义。
  - 包含的表：`nodes`, `devices`, `sources`, `flows`, `senders`, `receivers`, `connections`。
  - 使用方法：在PostgreSQL数据库中执行此脚本以创建必要的表和索引。
- **audio_mapping.sql**：定义音频通道和映射关系的表结构。
  - 包含的表：`audio_channels`, `audio_mappings`。
  - 使用方法：在初始化数据库后执行此脚本，以添加音频通道映射功能相关的表结构。

请确保在执行脚本之前已创建并选择了正确的数据库。