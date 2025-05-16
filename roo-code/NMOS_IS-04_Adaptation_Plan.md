# NMOS IS-04 1.2和1.3版本适配方案

## 1. 版本特性对比结果
根据提供的资料，从IS-04 v1.2到v1.3版本的主要变化包括：
- **节点 (Nodes)**：新增`attached_network_device`和`authorization`属性。
- **设备 (Devices)**：新增`authorization`属性。
- **源 (Sources)** 和 **流 (Flows)**：新增`event_type`属性。
- **注册模式下的节点发现**：多播DNS-SD (mDNS)已被弃用，推荐使用单播DNS-SD。

## 2. 代码修改建议
为了确保兼容性，需要在后端和前端添加版本检测和适配逻辑：

### 后端修改建议
- **文件**：[`roo-code/backend/nmos_registry_service/main.py`](roo-code/backend/nmos_registry_service/main.py)
  - **版本检测机制**：在与注册中心交互时，检测返回资源的版本信息。可以通过检查资源中的`version`字段格式或通过API查询注册中心的版本。
  - **资源处理逻辑**：根据版本差异调整资源处理逻辑。例如，对于v1.2版本，可能没有`attached_network_device`或`event_type`字段，需要有默认值或替代逻辑。
  - **WebSocket订阅**：确保订阅机制能够处理不同版本的更新格式。
  - **建议修改行**：在`process_resource_update`函数中（大约第136-167行），添加版本检查逻辑。

- **文件**：[`roo-code/backend/connection_management_service/main.py`](roo-code/backend/connection_management_service/main.py)
  - **依赖资源版本**：由于该服务依赖于注册服务获取IS-04资源，需要确保能够处理不同版本的资源格式。
  - **控制端点选择**：在选择IS-05控制端点时，考虑设备版本可能影响控制端点的可用性或格式。
  - **建议修改行**：在`find_is05_control_href_for_device`函数中（大约第75-103行），添加版本兼容性检查。

### 前端修改建议
- **文件**：[`roo-code/frontend/src/api.js`](roo-code/frontend/src/api.js)
  - **API路径动态调整**：当前硬编码了`/x-nmos/query/v1.3`，需要根据后端提供的版本信息动态选择API路径（如`/x-nmos/query/v1.2`或`/x-nmos/query/v1.3`）。
  - **资源字段适配**：在处理资源数据时，检查是否存在v1.3版本的新字段（如`event_type`），如果没有则使用默认值或替代显示逻辑。
  - **建议修改行**：在`fetchAllNmosResources`函数中（大约第58-90行），修改API路径为动态值。

## 3. 测试策略
- **单元测试**：为后端添加单元测试，模拟不同版本的资源数据，验证版本检测和处理逻辑是否正确。
- **集成测试**：使用模拟NMOS设备（如AMWA nmos-device-control-mock）测试与v1.2和v1.3版本设备的交互。
- **系统测试**：在真实环境中测试，确保与支持不同版本的注册中心和设备正确通信。

## 4. 兼容性确保措施
- **版本配置选项**：在后端添加配置选项，允许用户指定目标IS-04版本，以强制兼容性模式。
- **日志记录**：在处理资源时记录版本信息，以便于调试和追踪兼容性问题。
- **用户指南更新**：更新[`roo-code/USER_GUIDE.md`](roo-code/USER_GUIDE.md)，说明支持的IS-04版本和配置方法。

## 5. Mermaid流程图
以下是适配方案的流程图，展示了从版本检测到代码适配的步骤：

```mermaid
graph TD
    A[版本检测] --> B[资源格式检查]
    B --> C[适配v1.2逻辑]
    B --> D[适配v1.3逻辑]
    C --> E[处理旧版字段]
    D --> F[处理新版字段]
    E --> G[测试验证]
    F --> G[测试验证]
    G --> H[部署与监控]