# 使用官方Node.js镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json文件
COPY package.json package-lock.json ./

# 安装依赖
RUN npm install

# 复制前端代码
COPY . .

# 构建React应用
RUN npm run build

# 暴露前端端口
EXPOSE 3000

# 设置环境变量
ENV REACT_APP_API_BASE_URL=http://registry_service:8000/api
ENV REACT_APP_WEBSOCKET_URL=ws://event_service:8002/ws

# 运行前端应用
CMD ["npm", "start"]