# Roo Code 前端UI

Roo Code 是一个基于NMOS标准的控制系统，用于IP广播设备的路由控制。本目录包含前端UI代码，旨在提供美观直观的网页用户界面。

## 功能目标

- 网络拓扑可视化：显示已发现的NMOS设备及其连接状态。
- 设备状态仪表盘：提供设备运行状况和关键参数的概览。
- 连接矩阵/路由界面：直观地查看和创建Sender与Receiver之间的连接。
- 事件日志与Tally显示：实时显示IS-07事件和Tally状态。
- 配置面板：设置事件触发规则和音频通道映射。
- IS-08音频通道映射界面：可视化和操作音频通道。

## 技术栈

- 框架：React (配合Redux)
- API交互：Axios 或 Fetch API
- 实时更新：WebSocket

## 开发计划

按照分阶段方法，第二阶段将实现初始Web UI，用于设备发现和手动路由。