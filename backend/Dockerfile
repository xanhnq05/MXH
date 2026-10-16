# ===== MXH Backend Dockerfile =====
# Stage 1: Install production deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Dung npm install (khong can lockfile) thay npm ci de tranh loi out-of-sync
RUN npm install --omit=dev --no-audit --no-fund

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app

# Tao user khong-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

# Copy node_modules tu stage deps
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodeapp:nodejs . .

# Chuyen user
USER nodeapp

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health || exit 1

CMD ["node", "src/server.js"]
