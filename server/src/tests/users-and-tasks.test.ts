import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { db } from '../db/connection.js';
import { up as runMigrations } from '../db/migrate.js';
import { seed } from '../db/seed.js';
import authRoutes from '../routes/auth.routes.js';
import usersRoutes from '../routes/users.routes.js';
import tasksRoutes from '../routes/tasks.routes.js';
import { errorHandler } from '../middleware/errorHandler.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tasks', tasksRoutes);
app.use(errorHandler);

describe('User Access Control & Task Assignment Suite', () => {
  let adminToken: string;
  let supervisorToken: string;
  let workerToken: string;

  let createdSupervisorId: number;
  let createdWorkerId: number;
  let createdTaskId: number;

  beforeAll(async () => {
    await runMigrations();
    await seed(true);

    // 1. Login as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nursery.local', password: 'Admin@12345' });
    adminToken = adminRes.body.accessToken;

    // 2. Login as Supervisor
    const supRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor@nursery.local', password: 'Supervisor@12345' });
    supervisorToken = supRes.body.accessToken;

    // 3. Login as Worker
    const workerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker@nursery.local', password: 'Worker@12345' });
    workerToken = workerRes.body.accessToken;
  });

  describe('1. User Access Control (Creating Multiple IDs with Designations)', () => {
    it('Admin can create a new SUPERVISOR staff account', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Vikram Joshi (Greenhouse Lead)',
          email: 'vikram.joshi@nursery.local',
          password: 'Password@123',
          role: 'SUPERVISOR',
          designation: 'Greenhouse Section Supervisor',
          phone: '+91 98111 22233',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('SUPERVISOR');
      expect(res.body.user.designation).toBe('Greenhouse Section Supervisor');
      createdSupervisorId = res.body.user.id;
    });

    it('Admin can create a new WORKER staff account', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Anil Kumar (Grafting Specialist)',
          email: 'anil.kumar@nursery.local',
          password: 'Password@123',
          role: 'WORKER',
          designation: 'Cleft Grafting Field Worker',
          phone: '+91 98222 33344',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('WORKER');
      expect(res.body.user.designation).toBe('Cleft Grafting Field Worker');
      createdWorkerId = res.body.user.id;
    });

    it('Non-admin (Supervisor or Worker) is BLOCKED from creating user accounts', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          full_name: 'Unauthorized User',
          email: 'unauthorized@nursery.local',
          password: 'Password@123',
          role: 'WORKER',
        });

      expect(res.status).toBe(403);
    });

    it('Newly created worker can log in with their credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'anil.kumar@nursery.local', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.fullName).toBe('Anil Kumar (Grafting Specialist)');
      expect(res.body.user.role).toBe('WORKER');
    });

    it('Admin can list all staff accounts and filter by designation', async () => {
      const res = await request(app)
        .get('/api/users?role=WORKER')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.users.some((u: any) => u.email === 'anil.kumar@nursery.local')).toBe(true);
    });

    it('Admin can update user designation and details', async () => {
      const res = await request(app)
        .put(`/api/users/${createdWorkerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          designation: 'Senior Grafting Technician',
          phone: '+91 98222 99999',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.designation).toBe('Senior Grafting Technician');
      expect(res.body.user.phone).toBe('+91 98222 99999');
    });
  });

  describe('2. Task Assignment & Tracking System', () => {
    it('Admin can assign a task to a Supervisor', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Inspect Curing Chamber 2 Temp & Relative Humidity',
          description: 'Ensure RH stays above 85% for the 200 newly grafted mango batches.',
          assigned_to_user_id: createdSupervisorId,
          priority: 'HIGH',
          stage: 'CURING',
          due_date: '2026-03-25',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.task.assigned_to_user_id).toBe(createdSupervisorId);
      expect(res.body.task.status).toBe('PENDING');
      expect(res.body.task.priority).toBe('HIGH');
    });

    it('Admin or Supervisor can assign a task to a Worker', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Prepare 150 Rootstocks in Tunnel 2',
          description: 'Trim rootstock stems 15cm from collar and prepare cleft cuts.',
          assigned_to_user_id: createdWorkerId,
          priority: 'URGENT',
          stage: 'GRAFTING',
          due_date: '2026-03-20',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.task.assigned_to_user_id).toBe(createdWorkerId);
      expect(res.body.task.priority).toBe('URGENT');
      createdTaskId = res.body.task.id;
    });

    it('Worker is BLOCKED from assigning tasks', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          title: 'Worker trying to assign task',
          assigned_to_user_id: createdSupervisorId,
        });

      expect(res.status).toBe(403);
    });

    it('Worker can view tasks assigned to them', async () => {
      // Login as newly created worker
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'anil.kumar@nursery.local', password: 'Password@123' });

      const anilToken = loginRes.body.accessToken;

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${anilToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
      expect(res.body.tasks[0].assigned_to_user_id).toBe(createdWorkerId);
    });

    it('Worker can update status of their task to IN_PROGRESS', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'anil.kumar@nursery.local', password: 'Password@123' });

      const anilToken = loginRes.body.accessToken;

      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${anilToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('IN_PROGRESS');
    });

    it('Worker can mark task as COMPLETED with completion notes', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'anil.kumar@nursery.local', password: 'Password@123' });

      const anilToken = loginRes.body.accessToken;

      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${anilToken}`)
        .send({
          status: 'COMPLETED',
          completion_notes: 'Completed cleft preparation for all 150 rootstocks. Ready for grafting union.',
        });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('COMPLETED');
      expect(res.body.task.completion_notes).toContain('Completed cleft preparation');
      expect(res.body.task.completed_at).toBeDefined();
    });

    it('Task metrics return correct summary counts', async () => {
      const res = await request(app)
        .get('/api/tasks/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.total).toBeGreaterThanOrEqual(2);
      expect(res.body.metrics.completed).toBeGreaterThanOrEqual(1);
    });
  });
});

