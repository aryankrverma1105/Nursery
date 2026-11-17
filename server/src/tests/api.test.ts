import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { up as runMigrations } from '../db/migrate.js';
import { seed } from '../db/seed.js';
import { db } from '../db/connection.js';

describe('Nursery Management Platform - Full API Integration Suite', () => {
  let adminToken: string;
  let supervisorToken: string;
  let workerToken: string;

  beforeAll(async () => {
    await runMigrations();
    await seed(true);

    // 1. Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@nursery.local',
      password: 'Admin@12345',
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.accessToken;

    // 2. Authenticate Supervisor
    const supRes = await request(app).post('/api/auth/login').send({
      email: 'supervisor@nursery.local',
      password: 'Supervisor@12345',
    });
    expect(supRes.status).toBe(200);
    supervisorToken = supRes.body.accessToken;

    // 3. Authenticate Worker
    const workerRes = await request(app).post('/api/auth/login').send({
      email: 'worker@nursery.local',
      password: 'Worker@12345',
    });
    expect(workerRes.status).toBe(200);
    workerToken = workerRes.body.accessToken;
  });

  describe('M2 & M4: Public Website & CMS Content Delivery', () => {
    it('GET /api/public/settings should return public nursery branding and WhatsApp wa.me contact', async () => {
      const res = await request(app).get('/api/public/settings');
      expect(res.status).toBe(200);
      expect(res.body.settings.site_name).toBeDefined();
      expect(res.body.settings.contact_whatsapp).toBe('919876543210');
      expect(res.body.settings.site_name).toContain('[SAMPLE DATA]');
    });

    it('GET /api/public/homepage should return enabled sections in display order and non-expired banners', async () => {
      const res = await request(app).get('/api/public/homepage');
      expect(res.status).toBe(200);
      expect(res.body.sections).toBeInstanceOf(Array);
      expect(res.body.sections.length).toBeGreaterThan(0);
      expect(res.body.banners).toBeInstanceOf(Array);
      expect(res.body.featuredProducts).toBeInstanceOf(Array);
    });

    it('GET /api/public/products should support search, filtering and return derived availability', async () => {
      const res = await request(app).get('/api/public/products?search=Kesar');
      expect(res.status).toBe(200);
      expect(res.body.products).toBeInstanceOf(Array);
      if (res.body.products.length > 0) {
        const prod = res.body.products[0];
        expect(prod.availability).toBeDefined();
        // Derived from ready batch RFS-2026-00001
        expect(['In Stock', 'Limited Stock', 'Out of Stock', 'Coming Soon']).toContain(prod.availability);
      }
    });

    it('POST /api/public/enquiry should accept enquiry and block bot with honeypot', async () => {
      // Legitimate submission
      const legitimate = await request(app).post('/api/public/enquiry').send({
        name: 'Farmer Ramesh',
        phone: '+91 98765 00000',
        message: 'Interested in booking 100 Kesar mango grafts for upcoming season.',
      });
      expect(legitimate.status).toBe(200);

      // Bot honeypot trap filled
      const spam = await request(app).post('/api/public/enquiry').send({
        name: 'Spam Bot',
        phone: '+1 800 0000',
        message: 'Buy cheap watches now',
        botField: 'I am a malicious bot',
      });
      expect(spam.status).toBe(200); // Discarded silently without error
    });
  });

  describe('M3: RBAC & Permission Matrix Enforcement', () => {
    it('Unauthenticated requests to protected endpoints must be rejected with 401', async () => {
      const res = await request(app).get('/api/inventory/batches');
      expect(res.status).toBe(401);
    });

    it('Field Worker (USER) cannot access Admin CMS settings (403 Forbidden)', async () => {
      const res = await request(app)
        .put('/api/cms/settings')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ settings: { site_name: 'Hacked Farm' } });
      expect(res.status).toBe(403);
    });

    it('Supervisor cannot modify Admin website settings (403 Forbidden)', async () => {
      const res = await request(app)
        .put('/api/cms/settings')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ settings: { site_name: 'Supervisor Farm' } });
      expect(res.status).toBe(403);
    });

    it('Admin has full access to update website settings (200 OK)', async () => {
      const res = await request(app)
        .put('/api/cms/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ settings: { contact_phone: '+91 99999 88888' } });
      expect(res.status).toBe(200);
    });

    it('Failed logins should increment attempts and lock account after 5 attempts', async () => {
      // 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send({
          email: 'worker@nursery.local',
          password: 'WrongPassword123',
        });
      }

      // 6th attempt should be locked out with 403
      const lockedRes = await request(app).post('/api/auth/login').send({
        email: 'worker@nursery.local',
        password: 'Worker@12345',
      });
      expect(lockedRes.status).toBe(403);
      expect(lockedRes.body.error).toContain('locked');

      // Reset lockout for other tests
      await db('users').where({ email: 'worker@nursery.local' }).update({
        failed_login_attempts: 0,
        lockout_until: null,
      });
    });
  });

  describe('M5: Nursery Inventory Wizards, Lineage & Ledger Safety', () => {
    let newRootstockId: number;
    let newScionId: number;
    let newGraftedBatchId: number;
    let newReadyBatchId: number;

    it('Step 1: Record Sowing creates ROOTSTOCK batch and ledger movement', async () => {
      const seedLot = await db('seed_lots').first();
      expect(seedLot).toBeDefined();

      const res = await request(app)
        .post('/api/inventory/sowing')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          seed_lot_id: seedLot.id,
          seeds_sown: 100,
          sowing_date: '2026-03-01',
          location: 'Tunnel 4',
          notes: 'Test Sowing',
        });

      expect(res.status).toBe(201);
      expect(res.body.batch.serial_number).toMatch(/^(RS|ROOT)-\d{4}-\d{4,5}$/);
      newRootstockId = res.body.batch.batchId;

      // Verify double-entry ledger movement
      const movement = await db('inventory_movements').where({ batch_id: newRootstockId }).first();
      expect(movement).toBeDefined();
      expect(movement.movement_type).toBe('SOWING');
      expect(movement.quantity_change).toBe(100);
      expect(movement.resulting_balance).toBe(100);
    });

    it('Step 2: Record Scion Harvest creates SCION batch and ledger movement', async () => {
      const motherTree = await db('mother_trees').first();
      expect(motherTree).toBeDefined();

      const res = await request(app)
        .post('/api/inventory/scion-harvest')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          mother_tree_id: motherTree.id,
          cuttings_harvested: 100,
          harvest_date: '2026-03-02',
          technician_name: 'Technician Ramesh',
          notes: 'Test Scion Harvest',
        });

      expect(res.status).toBe(201);
      expect(res.body.batch.serial_number).toMatch(/^(SC|SCION)-\d{4}-\d{4,5}$/);
      newScionId = res.body.batch.batchId;

      const movement = await db('inventory_movements').where({ batch_id: newScionId }).first();
      expect(movement).toBeDefined();
      expect(movement.movement_type).toBe('SCION_HARVEST');
      expect(movement.resulting_balance).toBe(100);
    });

    it('Step 3: Record Grafting consumes rootstock + scion and links lineage', async () => {
      const res = await request(app)
        .post('/api/inventory/grafting')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          rootstock_batch_id: newRootstockId,
          scion_batch_id: newScionId,
          quantity_grafted: 60,
          grafting_date: '2026-03-03',
          technician_name: 'Technician Ramesh',
          curing_days: 21,
          notes: 'Test Grafting Operation',
        });

      expect(res.status).toBe(201);
      expect(res.body.batch.serial_number).toMatch(/^(GR|GRAFT)-\d{4}-\d{4,5}$/);
      newGraftedBatchId = res.body.batch.batchId;

      // Verify Rootstock and Scion balances were deducted by 60
      const rsUpdated = await db('batches').where({ id: newRootstockId }).first();
      expect(rsUpdated.current_quantity).toBe(40);

      const scUpdated = await db('batches').where({ id: newScionId }).first();
      expect(scUpdated.current_quantity).toBe(40);

      // Verify Lineage records
      const lineageRecords = await db('batch_lineage').where({ batch_id: newGraftedBatchId });
      expect(lineageRecords.length).toBe(2);
      expect(lineageRecords.map((l) => l.relationship_type)).toContain('ROOTSTOCK_PARENT');
      expect(lineageRecords.map((l) => l.relationship_type)).toContain('SCION_PARENT');
    });

    it('Step 4: Stock can NEVER go negative - over-grafting must fail', async () => {
      const res = await request(app)
        .post('/api/inventory/grafting')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          rootstock_batch_id: newRootstockId,
          scion_batch_id: newScionId,
          quantity_grafted: 9999, // Exceeds balance of 40
          grafting_date: '2026-03-03',
          technician_name: 'Technician Ramesh',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient');
    });

    it('Step 5: Record Mortality logs losses and writes negative ledger entry', async () => {
      const res = await request(app)
        .post('/api/inventory/mortality')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          batch_id: newGraftedBatchId,
          mortality_count: 5,
          cause_of_death: 'Graft union dry out',
        });

      expect(res.status).toBe(200);
      const batch = await db('batches').where({ id: newGraftedBatchId }).first();
      expect(batch.current_quantity).toBe(55); // 60 - 5 = 55
    });

    it('Step 6: Promote to Ready-for-Sale creates RFS batch and connects lineage', async () => {
      const res = await request(app)
        .post('/api/inventory/promote-ready')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          grafted_batch_id: newGraftedBatchId,
          quantity: 40,
          location: 'Dispatch Yard 2',
        });

      expect(res.status).toBe(201);
      expect(res.body.batch.serial_number).toMatch(/^(RFS)-\d{4}-\d{4,5}$/);
      newReadyBatchId = res.body.batch.rfsId;

      // Source batch balance reduced
      const source = await db('batches').where({ id: newGraftedBatchId }).first();
      expect(source.current_quantity).toBe(15); // 55 - 40 = 15

      // Lineage exists
      const lineage = await db('batch_lineage').where({ batch_id: newReadyBatchId }).first();
      expect(lineage.parent_batch_id).toBe(newGraftedBatchId);
      expect(lineage.relationship_type).toBe('PROMOTED_FROM');
    });
  });

  describe('M6: Sales, Traceability & Quarantine Cascades', () => {
    it('Record plant sale creates invoice, deducts stock via ledger, and blocks over-selling', async () => {
      const customer = await db('customers').first();
      const readyBatch = await db('batches').where({ batch_type: 'READY_FOR_SALE', status: 'READY' }).first();
      expect(readyBatch).toBeDefined();

      const initialStock = readyBatch.current_quantity;

      const res = await request(app)
        .post('/api/sales/orders')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          customer_id: customer.id,
          order_date: '2026-03-12',
          payment_mode: 'CASH',
          payment_status: 'PAID',
          items: [
            {
              batch_id: readyBatch.id,
              quantity: 5,
              unit_price: 180,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.order.invoice_number).toMatch(/^(SALE)-\d{4}-\d{4,5}$/);

      // Verify stock deducted
      const updated = await db('batches').where({ id: readyBatch.id }).first();
      expect(updated.current_quantity).toBe(initialStock - 5);

      // Verify ledger movement
      const movement = await db('inventory_movements')
        .where({ batch_id: readyBatch.id, movement_type: 'SALE_DEDUCTION' })
        .orderBy('created_at', 'desc')
        .first();
      expect(movement).toBeDefined();
      expect(movement.quantity_change).toBe(-5);
    });

    it('Traceability endpoint should resolve full pedigree graph from serial code', async () => {
      const res = await request(app)
        .get('/api/trace/GR-2026-00001')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.batch).toBeDefined();
      expect(res.body.batch.serial_number).toBe('GR-2026-00001');
      expect(res.body.parents).toBeInstanceOf(Array);
      expect(res.body.graftingRecord).toBeDefined();
      expect(res.body.graftingRecord.technician_name).toBe('Technician Ramesh');
    });

    it('Quarantine action blocks sales and cascades to descendant batches', async () => {
      // Find a batch that has descendants
      const parent = await db('batches').where({ serial_number: 'GR-2026-00001' }).first();
      expect(parent).toBeDefined();

      const quarantineRes = await request(app)
        .post('/api/trace/quarantine')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          batch_id: parent.id,
          reason: 'Suspected fungal wilt in rootstock bed',
        });

      expect(quarantineRes.status).toBe(200);

      // Verify parent status is QUARANTINED
      const updatedParent = await db('batches').where({ id: parent.id }).first();
      expect(updatedParent.status).toBe('QUARANTINED');

      // Attempting to sell from a quarantined ready batch must fail
      const customer = await db('customers').first();
      const readyChild = await db('batches').where({ serial_number: 'RFS-2026-00001' }).first();
      expect(readyChild.status).toBe('QUARANTINED');

      const saleAttempt = await request(app)
        .post('/api/sales/orders')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          customer_id: customer.id,
          order_date: '2026-03-12',
          payment_mode: 'CASH',
          items: [{ batch_id: readyChild.id, quantity: 1, unit_price: 180 }],
        });

      expect(saleAttempt.status).toBe(400);
      expect(saleAttempt.body.error).toContain('QUARANTINED');

      // Release batch with justification
      const releaseRes = await request(app)
        .post('/api/trace/release')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          batch_id: readyChild.id,
          reason: 'Pathology lab cleared sample, no fungal spores detected.',
        });
      expect(releaseRes.status).toBe(200);

      const releasedBatch = await db('batches').where({ id: readyChild.id }).first();
      expect(releasedBatch.status).toBe('READY');
    });
  });
});

