# 使用官方Python镜像作为基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements.txt文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY . .

# 暴露API端口
EXPOSE 8000

# 设置环境变量
ENV LOG_LEVEL=info
ENV API_PORT=8000

# 运行FastAPI应用
CMD ["bash", "-c", "uvicorn $SERVICE_NAME.main:app --host 0.0.0.0 --port $API_PORT --reload"]