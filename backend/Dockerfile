# ===== MXH Backend Dockerfile =====
# Stage 1: Build (không cần thiết vì Node.js, chỉ install deps)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app

# Tạo user không-root cho bảo mật
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

# Copy deps từ stage build
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodeapp:nodejs . .

# Chuyển sang user không-root
USER nodeapp

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health || exit 1

# Graceful shutdown
CMD ["node", "src/server.js"]
