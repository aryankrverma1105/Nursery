# ==========================================
# Multi-stage Dockerfile for Google Cloud Run & GCP Deployment
# Builds React SPA frontend & Node.js backend into a single unified container
# ==========================================

# Stage 1: Build React Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build Express Backend
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json server/tsconfig.json ./
RUN npm install
COPY server/src ./src
RUN npm run build

# Stage 3: Production Container
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY server/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend & static frontend dist
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./client-dist

RUN mkdir -p uploads data

EXPOSE 8080

CMD ["node", "dist/index.js"]
