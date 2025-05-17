# Roo Code NMOS控制软件

Roo Code是一个基于NMOS标准的控制系统，用于IP广播设备的路由控制，支持NMOS IS-04、05、07、08标准，提供设备发现、注册、连接管理、事件触发路由控制和音频通道映射功能。

## 项目结构

- **backend**: 后端服务，包括NMOS注册服务、连接管理服务、事件处理服务和音频映射服务。
- **frontend**: 前端Web UI，使用React和Redux框架。
- **database**: 数据库模式设计和SQL脚本。

## 开发计划

根据[Roo_Code_开发计划.md](Roo_Code_开发计划.md)，项目分为多个阶段进行开发。

## 当前状态

- **数据库**: 已完成基础模式设计和SQL脚本创建（init.sql和audio_mapping.sql）。
- **后端**: 已完成IS-04注册服务、IS-05连接管理服务和IS-08音频映射服务的开发。
- **前端**: 已完成初始Web UI部分，包括：
  - 搭建React和Redux框架。
  - 开发API网关（api.js），用于与后端服务通信。
  - 实现用于显示IS-04资源（Node, Device, Sender, Receiver）的UI组件（Devices.js）。
  - 实现手动路由UI（Connections.js），允许用户选择Sender和Receiver，通过后端触发即时IS-05连接。
  - 实现WebSocket客户端（websocket.js），用于从后端通知服务获取实时状态更新。
  - 实现音频通道映射UI（AudioMapping.js），允许用户选择支持IS-08的设备并执行音频映射操作（如静音、交换、重新路由）。

## 需要改进的方面

基于代码审阅，以下是一些需要改进的方面：
- **前端**：WebSocket消息处理逻辑中消息类型硬编码，建议定义常量或枚举；登录后数据初始化逻辑未完全实现。
- **后端**：NMOS注册服务中资源版本比较逻辑被注释，建议启用或优化；WebSocket连接关闭后重连逻辑未完全实现；日志记录中部分错误信息截断。

## 部署指南

请参考[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)了解如何部署Roo Code系统。

## 系统架构设计

请参考[Roo_Code_系统架构设计.md](Roo_Code_系统架构设计.md)了解系统的详细架构设计。