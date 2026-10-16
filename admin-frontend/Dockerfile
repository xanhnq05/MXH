# ===== MXH Admin Frontend Dockerfile =====
# Multi-stage build: install deps + Vite build → serve bằng NGINX

# ----- Stage 1: Build -----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source và build
COPY . .
RUN npm run build

# ----- Stage 2: Serve qua NGINX -----
FROM nginx:alpine AS production

# Copy build output từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy NGINX config riêng cho admin
COPY ../infra/admin.nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
