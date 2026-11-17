# Multi-stage Docker build for Nursery Management Server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json tsconfig.json ./
RUN npm install

# Copy source code and build
COPY src ./src
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Create uploads and data directories
RUN mkdir -p uploads data

EXPOSE 5000

USER node

CMD ["node", "dist/index.js"]

