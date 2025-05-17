# 使用官方 Python 运行时作为父镜像
# 选择一个与您的 Python 版本匹配的特定版本，例如 3.10, 3.11
# alpine 版本更小，但可能缺少一些编译依赖；slim 版本是一个不错的折中
FROM python:3.11-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE 1 # 防止 Python 写入 .pyc 文件到容器中
ENV PYTHONUNBUFFERED 1     # 防止 Python 缓冲 stdout 和 stderr，使日志立即显示
ENV PYTHONPATH /app

# 设置工作目录
WORKDIR /app

# 安装系统依赖 (如果您的 Python 包有C扩展等需要编译)
# 例如：RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
# 对于当前项目，FastAPI, uvicorn, requests, websockets, psycopg2-binary (PostgreSQL) 等可能不需要额外的系统库
# 如果 psycopg2 需要编译 (非 binary 版本)，则需要 libpq-dev

# 安装 pipenv (如果使用 Pipfile 管理依赖) - 根据您的项目，似乎是 requirements.txt
# RUN pip install pipenv

# 复制依赖定义文件
# 假设 requirements.txt 在 backend 目录下
COPY requirements.txt .

# 安装 Python 依赖
# 如果使用 pipenv:
# COPY Pipfile Pipfile.lock ./
# RUN pipenv install --system --deploy --ignore-pipfile
# 如果使用 requirements.txt:
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目代码到容器中
# 这会将 ./backend (构建上下文的根目录) 下的所有内容复制到容器的 /app 目录
COPY . .

# 暴露端口 (这更多是文档性的，实际端口映射在 docker-compose.yml 中完成)
# 由于每个服务使用不同的 API_PORT，我们不在这里 EXPOSE 固定端口。
# 或者 EXPOSE 一个通用的，例如 EXPOSE 8000

# 默认的命令可以被 docker-compose.yml 中的 command 覆盖
# 例如，可以设置一个默认的启动脚本或一个通用入口点
# CMD ["uvicorn", "nmos_registry_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
# 但由于我们有多个服务使用此 Dockerfile，并且通过 docker-compose.yml 的 command 启动不同服务，
# 所以这里的 CMD 可以省略，或者设置一个通用的，如：
# CMD ["python"]
# 或者，如果所有服务都通过 uvicorn 启动，而具体模块和端口由 docker-compose command 提供：
# ENTRYPOINT ["uvicorn"]
# 更简单的做法是让 docker-compose.yml 完全控制 command。

# 健康检查指令也可以在这里定义，但通常在 docker-compose.yml 中定义更灵活
# HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:${API_PORT:-8000}/health || exit 1
# 注意：${API_PORT} 在 Dockerfile 的 HEALTHCHECK 中可能无法直接使用 compose 的环境变量，
# 通常 compose 中的 healthcheck 更优。

# 打印一条消息表明构建阶段
RUN echo "Backend Docker image build complete."

