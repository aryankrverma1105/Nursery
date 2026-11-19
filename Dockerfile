# -------------------------------------------------------------
# Multi-stage Dockerfile for Nursery Management Platform
# Optimized for Google Cloud VM & Container Deployment
# -------------------------------------------------------------

# Stage 1: Build Environment
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy application source code
COPY . .

# Build both backend and frontend SPA
RUN npm run build:server
RUN npm run build:client

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=1111

# Copy manifests
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=server

# Copy compiled artifacts from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Persistent directory for uploaded farm media/images
RUN mkdir -p /app/uploads

# Expose requested port
EXPOSE 1111

# Start the combined server (serves API + SPA on port 1111)
CMD ["npm", "run", "start", "--workspace=server"]
