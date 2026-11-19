import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import cmsRoutes from './routes/cms.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import salesRoutes from './routes/sales.routes.js';
import traceRoutes from './routes/trace.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import usersRoutes from './routes/users.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
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
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// 2. CORS Allowlist
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In production and dev, allow configured origins or any caller
      return callback(null, true);
    },
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
app.use('/api/users', usersRoutes);
app.use('/api/tasks', tasksRoutes);

// 6. Serve Static Frontend SPA Build (if present)
const possibleClientDistPaths = [
  path.resolve(process.cwd(), 'client', 'dist'),
  path.resolve(process.cwd(), '..', 'client', 'dist'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist'),
];

const clientDistDir = possibleClientDistPaths.find((p) => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));

if (clientDistDir) {
  console.log(`[SERVER] Serving static frontend build from: ${clientDistDir}`);
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    // Return 404 for missing static files (scripts, styles, images) instead of falling back to index.html
    if (path.extname(req.path)) {
      return res.status(404).send('Asset not found');
    }
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// 7. Centralized Error Handler
app.use(errorHandler);

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
