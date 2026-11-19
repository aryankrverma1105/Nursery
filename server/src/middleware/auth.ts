import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db } from '../db/connection.js';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'WORKER' | 'USER' | string;
  fullName: string;
  permissions: string[];
  assignedRecords: number[];
  forcePasswordChange: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_super_secure_min_32_characters';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_super_secure_min_32_characters';

export function generateTokens(user: { id: number; email: string; role: string; fullName: string }) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
    const userRow = await db('users').where({ id: decoded.id, is_active: true }).first();

    if (!userRow) {
      return res.status(401).json({ error: 'User session invalid or account deactivated.' });
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      fullName: userRow.full_name,
      permissions: typeof userRow.permissions === 'string' ? JSON.parse(userRow.permissions || '[]') : userRow.permissions || [],
      assignedRecords: typeof userRow.assigned_records === 'string' ? JSON.parse(userRow.assigned_records || '[]') : userRow.assigned_records || [],
      forcePasswordChange: Boolean(userRow.force_password_change),
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Access token expired or invalid.' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const userRole = req.user.role === 'USER' ? 'WORKER' : req.user.role;
    const normalizedAllowed = allowedRoles.flatMap((r) => (r === 'WORKER' ? ['WORKER', 'USER'] : [r]));
    if (!normalizedAllowed.includes(req.user.role) && !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied: Insufficient role permissions.' });
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role === 'ADMIN') {
      return next();
    }
    if (req.user.permissions.includes('ALL') || req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ error: `Access denied: Missing '${permission}' permission.` });
  };
}

// Strict rate limit for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for enquiry submissions (spam prevention)
export const enquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many enquiries submitted from this IP. Please wait before sending again.' },
});

