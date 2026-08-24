# ============================================================
# STAGE 1: Build React Frontend
# ============================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================================
# STAGE 2: Backend Dependencies
# ============================================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --only=production

# ============================================================
# STAGE 3: Production Runtime (Cloud Run Container)
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install psql / pg dependencies if needed
RUN apk add --no-cache tzdata

# Copy backend dependencies and source
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY database/ ./database/

# Copy built frontend static assets into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose Cloud Run default port
EXPOSE 8080

# Run migrations and start Express server
CMD ["node", "backend/src/server.js"]
