# NMOS路由控制软件部署指南

本文档提供了使用Docker Compose部署NMOS路由控制软件的详细步骤。遵循以下指南，您可以在全新电脑上快速设置和运行整个系统。

## 前提条件

- **Docker**：确保已安装Docker和Docker Compose。
- **操作系统**：本指南适用于Windows、macOS和Linux系统。
- **硬件要求**：建议至少4核CPU，8GB内存，20GB可用磁盘空间。

## 系统概述

NMOS路由控制软件是一个基于NMOS标准的控制系统，支持IS-04、IS-05、IS-07和IS-08功能，提供设备发现、注册、连接管理、事件触发路由控制和音频通道映射功能。

### 主要功能模块
- **前端**：包括仪表板、设备管理、连接管理、事件监控、音频映射和网络拓扑。
- **后端**：包括NMOS注册服务、连接管理服务、事件处理服务和音频映射服务。

### 关键技术
- **前端**：React、React Router、Redux、Material-UI、WebSocket。
- **后端**：FastAPI、WebSocket、Pydantic、Uvicorn。

## 安装Docker和Docker Compose

如果您尚未安装Docker和Docker Compose，请按照以下步骤进行安装：

### Windows和macOS用户
1. 访问[Docker官方网站](https://www.docker.com/products/docker-desktop)下载Docker Desktop。
2. 运行安装程序并按照提示完成安装。
3. 安装完成后，启动Docker Desktop，Docker Compose会随Docker Desktop一起安装。

### Linux用户
1. 按照Docker官方文档安装Docker：
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io
   sudo systemctl start docker
   sudo systemctl enable docker
   ```
2. 安装Docker Compose：
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```
3. 验证安装：
   ```bash
   docker --version
   docker-compose --version
   ```

## 部署步骤

### 1. 克隆项目仓库

如果您还没有项目代码，请首先克隆项目仓库：

```bash
git clone <repository-url>
cd roo-code
```

### 2. 检查Docker Compose配置文件

确保[`docker-compose.yml`](roo-code/docker-compose.yml)文件位于项目根目录下，并且包含以下服务配置：

- `registry_service`：NMOS注册服务，端口8000。
- `connection_service`：连接管理服务，端口8001。
- `event_service`：事件处理服务，端口8002。
- `audio_mapping_service`：音频映射服务，端口8003。
- `frontend`：前端服务，端口3000。
- `postgres`：PostgreSQL数据库，端口5432。
- `redis`：Redis缓存数据库，端口6379。

### 3. 构建和启动服务

在项目根目录下运行以下命令，以构建和启动所有服务：

```bash
docker-compose up --build
```

此命令将下载必要的镜像，构建自定义镜像，并启动所有容器。首次运行可能需要几分钟时间。

如果您希望在后台运行服务，可以使用以下命令：

```bash
docker-compose up --build -d
```

### 4. 验证服务状态

使用以下命令检查所有服务的状态：

```bash
docker-compose ps
```

确保所有服务都显示为`Up`状态，并且健康检查通过。如果某个服务未启动，请检查日志以获取更多信息：

```bash
docker-compose logs <service-name>
```

您也可以查看特定服务的详细日志，例如前端服务：

```bash
docker-compose logs frontend
```

### 5. 访问前端界面

所有服务启动后，您可以通过浏览器访问前端界面：

- URL：`http://localhost:3000`

首次访问时，可能需要几秒钟加载页面，确保所有后端服务已完全启动。

### 6. 停止服务

当您需要停止服务时，可以运行以下命令：

```bash
docker-compose down
```

此命令将停止并移除所有容器，但不会删除持久化数据卷。如果您希望停止后台运行的服务并查看输出，可以先使用以下命令将服务带到前台：

```bash
docker-compose logs -f
```

然后按`Ctrl+C`停止服务，或者在另一个终端中使用`docker-compose down`命令。

如果您希望完全清除所有数据（包括数据库数据），可以使用以下命令：

```bash
docker-compose down -v
```

## 故障排除

- **服务未启动**：检查日志以获取错误信息，确保端口未被占用。可以使用以下命令检查端口占用情况：
  ```bash
  netstat -tuln | grep <port-number>
  ```
  如果端口被占用，可以修改[`docker-compose.yml`](roo-code/docker-compose.yml)文件中的端口映射。
- **数据库连接问题**：确保PostgreSQL和Redis服务已启动，并且环境变量配置正确。检查日志中是否有连接拒绝或超时错误。
- **前端无法连接到后端**：检查前端环境变量是否正确指向后端服务地址。确保网络连接正常，并且防火墙未阻止相关端口。
- **镜像构建失败**：检查Dockerfile中是否有语法错误，或者网络问题导致依赖下载失败。可以尝试清理缓存后重新构建：
  ```bash
  docker-compose build --no-cache
  ```
- **容器启动后立即退出**：检查容器日志，可能是配置文件错误或依赖服务未启动。确保服务启动顺序正确，可以在[`docker-compose.yml`](roo-code/docker-compose.yml)中设置`depends_on`参数。
- **性能问题**：如果系统运行缓慢，检查主机资源使用情况。可能需要增加Docker Desktop的资源分配（在设置中调整CPU和内存限制）。

### 需要改进的方面
基于代码审阅，以下是一些需要改进的方面：
- **前端**：WebSocket消息处理逻辑中消息类型硬编码，建议定义常量或枚举；登录后数据初始化逻辑未完全实现。
- **后端**：NMOS注册服务中资源版本比较逻辑被注释，建议启用或优化；WebSocket连接关闭后重连逻辑未完全实现；日志记录中部分错误信息截断。

## 高级配置

如果需要自定义配置，可以编辑[`docker-compose.yml`](roo-code/docker-compose.yml)文件中的环境变量或卷配置。例如，调整日志级别或数据库凭据。修改后，需要重新构建和启动服务：

```bash
docker-compose up --build
```

## 数据持久化

数据库数据存储在Docker卷中，即使容器停止或删除，数据也不会丢失。如果需要完全清除数据，可以使用以下命令：

```bash
docker-compose down -v
```

如果您希望备份数据卷，可以使用Docker卷备份工具或手动导出数据库数据。

## 联系支持

如果遇到问题，请联系项目维护团队或提交issue到项目仓库。

---
最后更新：2025年5月12日