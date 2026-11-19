import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AuditService } from '../services/audit/AuditService.js';

const router = Router();

// 1. GET TASKS LIST
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assigned_to, status, priority, stage, search, my_only } = req.query;
    const user = req.user!;
    const isWorker = user.role === 'WORKER' || user.role === 'USER';

    let query = db('tasks')
      .join('users as assignee', 'tasks.assigned_to_user_id', 'assignee.id')
      .leftJoin('users as creator', 'tasks.created_by_user_id', 'creator.id')
      .select(
        'tasks.*',
        'assignee.full_name as assignee_name',
        'assignee.email as assignee_email',
        'assignee.role as assignee_role',
        'assignee.designation as assignee_designation',
        'creator.full_name as creator_name',
        'creator.email as creator_email',
        'creator.role as creator_role'
      );

    // Workers only see their assigned tasks unless specified
    if (isWorker || my_only === 'true') {
      query = query.where('tasks.assigned_to_user_id', user.id);
    } else if (assigned_to) {
      query = query.where('tasks.assigned_to_user_id', parseInt(String(assigned_to), 10));
    }

    if (status && status !== 'ALL') {
      query = query.where('tasks.status', String(status).toUpperCase());
    }

    if (priority && priority !== 'ALL') {
      query = query.where('tasks.priority', String(priority).toUpperCase());
    }

    if (stage && stage !== 'ALL') {
      query = query.where('tasks.stage', String(stage).toUpperCase());
    }

    if (search) {
      const s = `%${String(search).toLowerCase()}%`;
      query = query.where((q) => {
        q.whereRaw('LOWER(tasks.title) LIKE ?', [s])
          .orWhereRaw('LOWER(tasks.description) LIKE ?', [s])
          .orWhereRaw('LOWER(assignee.full_name) LIKE ?', [s]);
      });
    }

    query = query.orderBy('tasks.created_at', 'desc');
    const tasks = await query;

    const formatted = tasks.map((t) => ({
      ...t,
      assignee_role: t.assignee_role === 'USER' ? 'WORKER' : t.assignee_role,
      creator_role: t.creator_role === 'USER' ? 'WORKER' : t.creator_role,
    }));

    return res.json({ tasks: formatted });
  } catch (err) {
    next(err);
  }
});

// 2. GET TASK METRICS & COUNTS
router.get('/metrics', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const isWorker = user.role === 'WORKER' || user.role === 'USER';

    let baseQuery = db('tasks');
    if (isWorker) {
      baseQuery = baseQuery.where({ assigned_to_user_id: user.id });
    }

    const total = await baseQuery.clone().count('id as count').first();
    const pending = await baseQuery.clone().where({ status: 'PENDING' }).count('id as count').first();
    const inProgress = await baseQuery.clone().where({ status: 'IN_PROGRESS' }).count('id as count').first();
    const completed = await baseQuery.clone().where({ status: 'COMPLETED' }).count('id as count').first();
    const urgent = await baseQuery.clone().where({ priority: 'URGENT' }).whereNot({ status: 'COMPLETED' }).count('id as count').first();

    const myAssignedRes = await db('tasks')
      .where({ assigned_to_user_id: user.id })
      .whereIn('status', ['PENDING', 'IN_PROGRESS'])
      .count('id as count')
      .first();

    return res.json({
      metrics: {
        total: parseInt(String(total?.count || '0'), 10),
        pending: parseInt(String(pending?.count || '0'), 10),
        inProgress: parseInt(String(inProgress?.count || '0'), 10),
        completed: parseInt(String(completed?.count || '0'), 10),
        urgent: parseInt(String(urgent?.count || '0'), 10),
        myPending: parseInt(String(myAssignedRes?.count || '0'), 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. CREATE & ASSIGN NEW TASK (Admin & Supervisor Only)
const CreateTaskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters'),
  description: z.string().optional().nullable(),
  assigned_to_user_id: z.number().int().positive('Please select a staff member'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  stage: z.enum(['SOWING', 'GROWTH', 'GRAFTING', 'CURING', 'READY_FOR_SALE', 'SELLING', 'GENERAL']).default('GENERAL'),
  due_date: z.string().optional().nullable(),
});

router.post('/', requireAuth, requireRole(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateTaskSchema.parse(req.body);

    // Verify assigned user exists and is active
    const assignee = await db('users').where({ id: validated.assigned_to_user_id, is_active: true }).first();
    if (!assignee) {
      return res.status(400).json({ error: 'Assigned staff member not found or is currently inactive.' });
    }

    const [tIdObj] = await db('tasks').insert({
      title: validated.title.trim(),
      description: validated.description ? validated.description.trim() : null,
      assigned_to_user_id: validated.assigned_to_user_id,
      created_by_user_id: req.user!.id,
      priority: validated.priority,
      stage: validated.stage,
      status: 'PENDING',
      due_date: validated.due_date || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning('id');

    const newTaskId = typeof tIdObj === 'object' ? tIdObj.id : tIdObj;

    const createdTask = await db('tasks')
      .join('users as assignee', 'tasks.assigned_to_user_id', 'assignee.id')
      .leftJoin('users as creator', 'tasks.created_by_user_id', 'creator.id')
      .where('tasks.id', newTaskId)
      .select(
        'tasks.*',
        'assignee.full_name as assignee_name',
        'assignee.email as assignee_email',
        'assignee.role as assignee_role',
        'assignee.designation as assignee_designation',
        'creator.full_name as creator_name'
      )
      .first();

    await AuditService.log({
      userId: req.user!.id,
      action: 'TASK_ASSIGNED',
      entityType: 'TASK',
      entityId: String(newTaskId),
      newValues: {
        title: validated.title,
        assigned_to: assignee.full_name,
        assigned_to_user_id: assignee.id,
        priority: validated.priority,
        stage: validated.stage,
        due_date: validated.due_date,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Task assigned successfully to ${assignee.full_name} (${assignee.role === 'USER' ? 'WORKER' : assignee.role}).`,
      task: createdTask,
    });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    next(err);
  }
});

// 4. UPDATE TASK DETAILS (Admin / Supervisor)
const UpdateTaskSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional().nullable(),
  assigned_to_user_id: z.number().int().positive().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  stage: z.enum(['SOWING', 'GROWTH', 'GRAFTING', 'CURING', 'READY_FOR_SALE', 'SELLING', 'GENERAL']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  due_date: z.string().optional().nullable(),
  completion_notes: z.string().optional().nullable(),
});

router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const validated = UpdateTaskSchema.parse(req.body);

    const task = await db('tasks').where({ id }).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const user = req.user!;
    const isManager = user.role === 'ADMIN' || user.role === 'SUPERVISOR';
    const isAssignee = task.assigned_to_user_id === user.id;

    if (!isManager && !isAssignee) {
      return res.status(403).json({ error: 'You do not have permission to update this task.' });
    }

    const updates: any = {
      updated_at: db.fn.now(),
    };

    if (isManager) {
      if (validated.title) updates.title = validated.title.trim();
      if (validated.description !== undefined) updates.description = validated.description;
      if (validated.assigned_to_user_id) updates.assigned_to_user_id = validated.assigned_to_user_id;
      if (validated.priority) updates.priority = validated.priority;
      if (validated.stage) updates.stage = validated.stage;
      if (validated.due_date !== undefined) updates.due_date = validated.due_date;
    }

    if (validated.status) {
      updates.status = validated.status;
      if (validated.status === 'COMPLETED' && task.status !== 'COMPLETED') {
        updates.completed_at = db.fn.now();
      } else if (validated.status !== 'COMPLETED') {
        updates.completed_at = null;
      }
    }

    if (validated.completion_notes !== undefined) {
      updates.completion_notes = validated.completion_notes;
    }

    await db('tasks').where({ id }).update(updates);
    const updated = await db('tasks').where({ id }).first();

    await AuditService.log({
      userId: user.id,
      action: 'TASK_UPDATED',
      entityType: 'TASK',
      entityId: String(id),
      newValues: updates,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Task updated successfully.',
      task: updated,
    });
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    next(err);
  }
});

// 5. QUICK STATUS UPDATE (Workers & Supervisors marking task In-Progress or Completed)
router.patch('/:id/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, completion_notes } = req.body;

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const newStatus = String(status).toUpperCase();
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const task = await db('tasks').where({ id }).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const user = req.user!;
    const isManager = user.role === 'ADMIN' || user.role === 'SUPERVISOR';
    const isAssignee = task.assigned_to_user_id === user.id;

    if (!isManager && !isAssignee) {
      return res.status(403).json({ error: 'You can only update status for tasks assigned to you.' });
    }

    const updates: any = {
      status: newStatus,
      updated_at: db.fn.now(),
    };

    if (newStatus === 'COMPLETED') {
      updates.completed_at = db.fn.now();
    } else {
      updates.completed_at = null;
    }

    if (completion_notes !== undefined) {
      updates.completion_notes = completion_notes;
    }

    await db('tasks').where({ id }).update(updates);
    const updated = await db('tasks').where({ id }).first();

    await AuditService.log({
      userId: user.id,
      action: 'TASK_STATUS_CHANGED',
      entityType: 'TASK',
      entityId: String(id),
      newValues: { status: newStatus, notes: completion_notes },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Task marked as ${newStatus}.`,
      task: updated,
    });
  } catch (err) {
    next(err);
  }
});

// 6. DELETE / CANCEL TASK (Admin & Supervisor Only)
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const task = await db('tasks').where({ id }).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await db('tasks').where({ id }).delete();

    await AuditService.log({
      userId: req.user!.id,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: String(id),
      oldValues: { title: task.title, assigned_to: task.assigned_to_user_id },
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
