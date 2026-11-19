import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AuditService } from '../services/audit/AuditService.js';

const router = Router();

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['ALL'],
  SUPERVISOR: [
    'INVENTORY_READ',
    'INVENTORY_WRITE',
    'SALES_READ',
    'SALES_WRITE',
    'TRACE_READ',
    'QUARANTINE_MANAGE',
    'TASKS_MANAGE',
  ],
  WORKER: [
    'INVENTORY_READ',
    'INVENTORY_WRITE',
    'TASKS_EXECUTE',
  ],
  USER: [
    'INVENTORY_READ',
    'INVENTORY_WRITE',
    'TASKS_EXECUTE',
  ],
};

// 1. GET ALL USERS (Admin & Supervisor can access to view team / assign tasks)
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search, status } = req.query;

    let query = db('users').select(
      'id',
      'email',
      'full_name',
      'role',
      'phone',
      'designation',
      'is_active',
      'force_password_change',
      'permissions',
      'created_at',
      'updated_at'
    );

    if (role) {
      const r = String(role).toUpperCase();
      if (r === 'WORKER') {
        query = query.whereIn('role', ['WORKER', 'USER']);
      } else {
        query = query.where('role', r);
      }
    }

    if (status === 'active') {
      query = query.where('is_active', true);
    } else if (status === 'inactive') {
      query = query.where('is_active', false);
    }

    if (search) {
      const s = `%${String(search).toLowerCase()}%`;
      query = query.where((q) => {
        q.whereRaw('LOWER(full_name) LIKE ?', [s])
          .orWhereRaw('LOWER(email) LIKE ?', [s]);
      });
    }

    query = query.orderBy('created_at', 'desc');
    const users = await query;

    // Attach pending tasks count for each user if tasks table exists
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        let pendingTasks = 0;
        try {
          const taskRes = await db('tasks')
            .where({ assigned_to_user_id: u.id })
            .whereIn('status', ['PENDING', 'IN_PROGRESS'])
            .count('id as count')
            .first();
          pendingTasks = parseInt(String(taskRes?.count || '0'), 10);
        } catch {}

        const normalizedRole = u.role === 'USER' ? 'WORKER' : u.role;
        return {
          ...u,
          role: normalizedRole,
          designation: u.designation || normalizedRole,
          permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions || '[]') : u.permissions || [],
          pending_tasks_count: pendingTasks,
        };
      })
    );

    return res.json({ users: usersWithStats });
  } catch (err) {
    next(err);
  }
});

// 2. CREATE NEW USER ID (Admin Only)
const CreateUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'WORKER', 'USER']).default('WORKER'),
  designation: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
  force_password_change: z.boolean().default(false),
  permissions: z.array(z.string()).optional(),
});

router.post('/', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateUserSchema.parse(req.body);
    const normalizedRole = validated.role === 'USER' ? 'WORKER' : validated.role;

    // Check email uniqueness
    const existing = await db('users').whereRaw('LOWER(email) = ?', [validated.email.toLowerCase()]).first();
    if (existing) {
      return res.status(400).json({ error: `An account with email '${validated.email}' already exists.` });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(validated.password, salt);

    const permissions = validated.permissions && validated.permissions.length > 0
      ? validated.permissions
      : DEFAULT_PERMISSIONS[normalizedRole] || DEFAULT_PERMISSIONS.WORKER;

    const [newIdObj] = await db('users').insert({
      email: validated.email.toLowerCase().trim(),
      password_hash,
      full_name: validated.full_name.trim(),
      role: normalizedRole,
      designation: validated.designation || normalizedRole,
      phone: validated.phone || null,
      is_active: validated.is_active,
      force_password_change: validated.force_password_change,
      permissions: JSON.stringify(permissions),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning('id');

    const newUserId = typeof newIdObj === 'object' ? newIdObj.id : newIdObj;

    const createdUser = await db('users').where({ id: newUserId }).first();

    await AuditService.log({
      userId: req.user!.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: String(newUserId),
      newValues: {
        id: newUserId,
        email: validated.email,
        full_name: validated.full_name,
        role: normalizedRole,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Staff ID created successfully for ${validated.full_name} (${normalizedRole}).`,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        full_name: createdUser.full_name,
        role: normalizedRole,
        designation: createdUser.designation,
        phone: createdUser.phone,
        is_active: Boolean(createdUser.is_active),
        permissions,
        created_at: createdUser.created_at,
      },
    });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    next(err);
  }
});

// 3. UPDATE USER DETAILS & PERMISSIONS (Admin Only)
const UpdateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'WORKER', 'USER']).optional(),
  designation: z.string().optional(),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  force_password_change: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

router.put('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const validated = UpdateUserSchema.parse(req.body);

    const user = await db('users').where({ id }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protection: Prevent admin from deactivating or demoting self
    if (user.id === req.user!.id) {
      if (validated.is_active === false) {
        return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
      }
      if (validated.role && validated.role !== 'ADMIN') {
        return res.status(400).json({ error: 'You cannot demote your own admin account.' });
      }
    }

    // If email is changing, check uniqueness
    if (validated.email && validated.email.toLowerCase() !== user.email.toLowerCase()) {
      const duplicate = await db('users')
        .whereRaw('LOWER(email) = ?', [validated.email.toLowerCase()])
        .whereNot({ id })
        .first();
      if (duplicate) {
        return res.status(400).json({ error: `Email '${validated.email}' is already in use by another user.` });
      }
    }

    const updates: any = {
      updated_at: db.fn.now(),
    };

    if (validated.full_name) updates.full_name = validated.full_name.trim();
    if (validated.email) updates.email = validated.email.toLowerCase().trim();
    if (validated.role) {
      updates.role = validated.role === 'USER' ? 'WORKER' : validated.role;
      if (!validated.designation) updates.designation = updates.role;
    }
    if (validated.designation) updates.designation = validated.designation;
    if (validated.phone !== undefined) updates.phone = validated.phone;
    if (validated.is_active !== undefined) updates.is_active = validated.is_active;
    if (validated.force_password_change !== undefined) updates.force_password_change = validated.force_password_change;
    if (validated.permissions) updates.permissions = JSON.stringify(validated.permissions);

    await db('users').where({ id }).update(updates);
    const updated = await db('users').where({ id }).first();

    await AuditService.log({
      userId: req.user!.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: String(id),
      oldValues: { email: user.email, role: user.role, is_active: user.is_active },
      newValues: {
        full_name: updated.full_name,
        email: updated.email,
        role: updated.role,
        designation: updated.designation,
        phone: updated.phone,
        is_active: updated.is_active,
      },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `User ${updated.full_name} updated successfully.`,
      user: {
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        role: updated.role === 'USER' ? 'WORKER' : updated.role,
        designation: updated.designation,
        phone: updated.phone,
        is_active: Boolean(updated.is_active),
        permissions: typeof updated.permissions === 'string' ? JSON.parse(updated.permissions || '[]') : updated.permissions || [],
      },
    });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    next(err);
  }
});

// 4. ADMIN RESET USER PASSWORD
const ResetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters long'),
});

router.put('/:id/password', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { new_password } = ResetPasswordSchema.parse(req.body);

    const user = await db('users').where({ id }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await db('users').where({ id }).update({
      password_hash,
      failed_login_attempts: 0,
      lockout_until: null,
      force_password_change: true,
      updated_at: db.fn.now(),
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: String(id),
      newValues: { reset_by_admin: req.user!.id },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Password for ${user.full_name} has been reset. They will be prompted to change it upon next login.`,
    });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    next(err);
  }
});

// 5. DEACTIVATE / DELETE USER (Admin Only)
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await db('users').where({ id }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Try deleting; if foreign keys prevent delete, safely deactivate
    try {
      await db('users').where({ id }).delete();
      await AuditService.log({
        userId: req.user!.id,
        action: 'USER_DELETED',
        entityType: 'USER',
        entityId: String(id),
        oldValues: { email: user.email, full_name: user.full_name },
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: `User ${user.full_name} permanently deleted.` });
    } catch {
      // Soft-deactivate if linked to historical inventory movements or records
      await db('users').where({ id }).update({
        is_active: false,
        updated_at: db.fn.now(),
      });
      await AuditService.log({
        userId: req.user!.id,
        action: 'USER_DEACTIVATED',
        entityType: 'USER',
        entityId: String(id),
        oldValues: { email: user.email, full_name: user.full_name },
        ipAddress: req.ip,
      });
      return res.json({
        success: true,
        message: `User ${user.full_name} has historical audit activity and has been safely deactivated.`,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
