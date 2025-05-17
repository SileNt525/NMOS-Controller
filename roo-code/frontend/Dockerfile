# ---- Stage 1: Build the React application ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json
COPY package.json ./
# COPY package-lock.json ./  # <--- 移除或注释掉这一行

# Install project dependencies
# 如果 package-lock.json 不存在 (因为我们没有 COPY 它进来),
# npm install 会根据 package.json 解析依赖，并在容器内部创建一个临时的 package-lock.json。
# 这将允许构建继续，但意味着每次从头构建（无缓存）时，依赖解析可能会略有不同。
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Build the application for production
RUN npm run build

# ---- Stage 2: Serve the built application using a lightweight server (Nginx) ----
FROM nginx:1.27-alpine-slim
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 确保 nginx.conf 在 roo-code/frontend/ 目录下
EXPOSE 80
RUN echo "Frontend Docker image build complete. Static files copied to Nginx."
