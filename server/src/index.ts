import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import cmsRoutes from './routes/cms.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import salesRoutes from './routes/sales.routes.js';
import traceRoutes from './routes/trace.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { up as runMigrations } from './db/migrate.js';
import { seed } from './db/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. Security & Protection Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", CLIENT_ORIGIN, 'http://localhost:5000', 'http://localhost:5173'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS Allowlist
app.use(
  cors({
    origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Local Storage Adapter for Uploads
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// 4. Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'Deep Root Farms API',
  });
});

// 5. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/trace', traceRoutes);
app.use('/api/reports', reportsRoutes);

// 6. Centralized Error Handler
app.use(errorHandler);

import { fileURLToPath } from 'url';

// Auto-run migrations and seed when started directly
export async function startServer() {
  await runMigrations();
  await seed(process.env.DEV_SAMPLE_DATA !== 'false');

  return app.listen(PORT, () => {
    console.log(`[SERVER] Nursery Management API running on http://localhost:${PORT}`);
  });
}

const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url).toLowerCase().replace(/\\/g, '/') === path.resolve(process.argv[1]).toLowerCase().replace(/\\/g, '/')
);

if (isMain) {
  startServer().catch((err) => {
    console.error('[FATAL SERVER START ERROR]', err);
    process.exit(1);
  });
}

export default app;
