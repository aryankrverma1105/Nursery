import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { generateTokens, requireAuth, authRateLimiter } from '../middleware/auth.js';
import { AuditService } from '../services/audit/AuditService.js';

const router = Router();
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_super_secure_min_32_characters';

const isSecureCookie = (req: Request) => {
  return process.env.COOKIE_SECURE === 'true' || Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
};

// 1. LOGIN
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await db('users').whereRaw('LOWER(email) = ?', [email.toLowerCase()]).first();

    if (!user) {
      await AuditService.log({
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        oldValues: { email, reason: 'User not found' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    // Check account lockout
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      return res.status(403).json({
        error: `Account temporarily locked due to multiple failed logins. Try again after ${new Date(user.lockout_until).toLocaleTimeString()}.`,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'This staff account has been deactivated. Contact Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: attempts };

      if (attempts >= 5) {
        updates.lockout_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }

      await db('users').where({ id: user.id }).update(updates);

      await AuditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        oldValues: { email, attempts },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(401).json({
        error: attempts >= 5
          ? 'Too many failed login attempts. Account locked for 15 minutes.'
          : `Invalid password. ${5 - attempts} attempts remaining before lockout.`,
      });
    }

    // Successful login: reset failed attempts
    await db('users').where({ id: user.id }).update({
      failed_login_attempts: 0,
      lockout_until: null,
      updated_at: db.fn.now(),
    });

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    // Set secure httpOnly cookie (auto-detect HTTPS vs plain HTTP)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isSecureCookie(req),
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isSecureCookie(req),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await AuditService.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        forcePasswordChange: Boolean(user.force_password_change),
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : user.permissions || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. TOKEN REFRESH
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token not found.' });
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    const user = await db('users').where({ id: decoded.id, is_active: true }).first();

    if (!user) {
      return res.status(401).json({ error: 'User no longer active.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isSecureCookie(req),
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isSecureCookie(req),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token expired or invalid.' });
  }
});

// 3. LOGOUT
router.post('/logout', async (req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully.' });
});

// 4. GET CURRENT USER
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  return res.json({ user: req.user });
});

// 5. CHANGE PASSWORD (e.g. for forced password change on first login)
const ChangePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    const user = await db('users').where({ id: req.user!.id }).first();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.force_password_change && currentPassword) {
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Current password incorrect.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db('users').where({ id: user.id }).update({
      password_hash: newHash,
      force_password_change: false,
      updated_at: db.fn.now(),
    });

    await AuditService.log({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 6. FORGOT PASSWORD
router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await db('users').whereRaw('LOWER(email) = ?', [email.toLowerCase()]).first();

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db('password_reset_tokens').insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: db.fn.now(),
      });

      console.log(`\n======================================================`);
      console.log(`[PASSWORD RESET ADAPTER (DEV CONSOLE)]`);
      console.log(`Recipient: ${user.email}`);
      console.log(`Reset Token: ${rawToken}`);
      console.log(`Reset Link: http://localhost:5173/reset-password?token=${rawToken}`);
      console.log(`======================================================\n`);
    }

    // Always return success to avoid leaking registered emails
    return res.json({
      message: 'If the email exists in our records, password reset instructions have been dispatched.',
    });
  } catch (err) {
    next(err);
  }
});

// 7. RESET PASSWORD WITH TOKEN
router.post('/reset-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = z
      .object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
      .parse(req.body);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await db('password_reset_tokens')
      .where({ token_hash: tokenHash })
      .whereNull('used_at')
      .where('expires_at', '>', new Date())
      .first();

    if (!resetRecord) {
      return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db('users').where({ id: resetRecord.user_id }).update({
      password_hash: newHash,
      force_password_change: false,
      updated_at: db.fn.now(),
    });

    await db('password_reset_tokens').where({ id: resetRecord.id }).update({
      used_at: db.fn.now(),
    });

    return res.json({ message: 'Password has been reset successfully. You may now log in.' });
  } catch (err) {
    next(err);
  }
});

export default router;

