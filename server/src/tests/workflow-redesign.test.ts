import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { up as runMigrations } from '../db/migrate.js';
import { seed } from '../db/seed.js';
import { db } from '../db/connection.js';

describe('Complete Farm Workflow Redesign - End-to-End Test Suite', () => {
  let adminToken: string;
  let supervisorToken: string;

  beforeAll(async () => {
    await runMigrations();
    await seed(true);

    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@nursery.local',
      password: 'Admin@12345',
    });
    adminToken = adminRes.body.accessToken;

    const supRes = await request(app).post('/api/auth/login').send({
      email: 'supervisor@nursery.local',
      password: 'Supervisor@12345',
    });
    supervisorToken = supRes.body.accessToken;
  });

  let rootstockBatchId: number;
  let scionBatchId: number;
  let graftedBatchId: number;
  let rfsBatchId: number;
  let saleInvoiceNumber: string;

  it('Phase A: SOWING - Both Rootstock & Scion creates two independent batches', async () => {
    const res = await request(app)
      .post('/api/inventory/sowing')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        types: ['ROOTSTOCK', 'SCION'],
        sowing_date: '2026-04-01',
        seed_source: 'National Horticulture Board Seed Center',
        location: 'Polyhouse Bay 1',
        notes: 'High-density seasonal sowing run',
        rootstock: {
          variety: 'Desi Polyembryonic Mango Rootstock',
          seeds_sown: 150,
          location: 'Polyhouse Bay 1 - Bed A',
        },
        scion: {
          variety: 'Ratnagiri Alphonso Mango',
          seeds_sown: 150,
          location: 'Polyhouse Bay 1 - Bed B',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.batches.length).toBe(2);

    const rootBatch = res.body.batches.find((b: any) => b.batch_type === 'ROOTSTOCK');
    const scionBatch = res.body.batches.find((b: any) => b.batch_type === 'SCION');

    expect(rootBatch).toBeDefined();
    expect(rootBatch.serial_number).toMatch(/^(ROOT|RS)-\d{4}-\d{4,5}$/);
    expect(rootBatch.current_quantity).toBe(150);
    rootstockBatchId = rootBatch.id;

    expect(scionBatch).toBeDefined();
    expect(scionBatch.serial_number).toMatch(/^(SCION|SC)-\d{4}-\d{4,5}$/);
    expect(scionBatch.current_quantity).toBe(150);
    scionBatchId = scionBatch.id;

    // Verify sowing records exist for both
    const sowings = await db('sowing_records').whereIn('batch_id', [rootstockBatchId, scionBatchId]);
    expect(sowings.length).toBe(2);
  });

  it('Phase B: GERMINATION TRACKING - Multiple dated observations without overwriting', async () => {
    // 1st Observation on Rootstock: Day 7
    const obs1 = await request(app)
      .post(`/api/inventory/germination/${rootstockBatchId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        observation_date: '2026-04-08',
        germinated_count: 80,
        non_germinated_count: 70,
        damaged_dead_count: 2,
        notes: 'Initial sprouts emerging uniformly',
      });

    expect(obs1.status).toBe(201);
    expect(obs1.body.observation.germination_rate).toBe(53.3);
    expect(obs1.body.observation.viable_seedlings_count).toBe(78);

    // 2nd Observation on Rootstock: Day 14 (Must NEVER overwrite obs1!)
    const obs2 = await request(app)
      .post(`/api/inventory/germination/${rootstockBatchId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        observation_date: '2026-04-15',
        germinated_count: 135,
        non_germinated_count: 15,
        damaged_dead_count: 5,
        notes: 'Secondary flush completed. High vigor.',
      });

    expect(obs2.status).toBe(201);
    expect(obs2.body.observation.germination_rate).toBe(90);
    expect(obs2.body.observation.viable_seedlings_count).toBe(130);

    // Verify database preserves both observations
    const allObs = await db('germination_observations').where({ batch_id: rootstockBatchId });
    expect(allObs.length).toBe(2);

    // Verify batch current_quantity updated to viable seedlings
    const batch = await db('batches').where({ id: rootstockBatchId }).first();
    expect(batch.current_quantity).toBe(130);

    // Add observation for Scion batch
    await request(app)
      .post(`/api/inventory/germination/${scionBatchId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        observation_date: '2026-04-15',
        germinated_count: 140,
        damaged_dead_count: 5,
        notes: 'Scion mother seedling flush complete',
      });
  });

  it('Phase C: PLANT GROWTH - Status progression and dated loss recording', async () => {
    // Advance status to READY_FOR_GRAFTING
    const statusRes = await request(app)
      .post(`/api/inventory/growth/${rootstockBatchId}/status`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        new_status: 'READY_FOR_GRAFTING',
        log_date: '2026-04-20',
        notes: 'Stem caliper reached 8mm pencil thickness',
      });

    expect(statusRes.status).toBe(200);

    // Advance scion status
    await request(app)
      .post(`/api/inventory/growth/${scionBatchId}/status`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        new_status: 'READY_FOR_GRAFTING',
        log_date: '2026-04-20',
        notes: 'Terminal buds mature and ready for cleft cut',
      });

    // Record mortality/loss
    const lossRes = await request(app)
      .post(`/api/inventory/growth/${rootstockBatchId}/loss`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        loss_quantity: 5,
        reason: 'Stem borer infestation',
        log_date: '2026-04-22',
      });

    expect(lossRes.status).toBe(200);
    expect(lossRes.body.new_quantity).toBe(125); // 130 - 5 = 125
  });

  it('Phase D: GRAFTING - Atomic deduction from both parents and new graft batch', async () => {
    const res = await request(app)
      .post('/api/inventory/grafting')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        rootstock_batch_id: rootstockBatchId,
        scion_batch_id: scionBatchId,
        quantity_grafted: 100,
        grafting_date: '2026-04-25',
        technician_name: 'Master Grafter Suresh',
        grafting_method: 'Wedge / Cleft Grafting',
        notes: 'Precision grafting run for premium orchards',
      });

    expect(res.status).toBe(201);
    expect(res.body.batch.serial_number).toMatch(/^(GRAFT|GR)-\d{4}-\d{4,5}$/);
    graftedBatchId = res.body.batch.id;

    // Both parents deducted by 100
    const rootstock = await db('batches').where({ id: rootstockBatchId }).first();
    expect(rootstock.current_quantity).toBe(25); // 125 - 100 = 25

    const scion = await db('batches').where({ id: scionBatchId }).first();
    expect(scion.current_quantity).toBe(35); // 135 - 100 = 35

    // Lineage links to BOTH parents
    const links = await db('batch_lineage').where({ batch_id: graftedBatchId });
    expect(links.length).toBe(2);
    expect(links.map((l) => l.relationship_type)).toContain('ROOTSTOCK_PARENT');
    expect(links.map((l) => l.relationship_type)).toContain('SCION_PARENT');
  });

  it('Phase E: CURING & SURVIVAL - Progressive healing observations', async () => {
    // Week 1 observation: 92 healed, 8 failed
    const res = await request(app)
      .post(`/api/inventory/curing/${graftedBatchId}/observation`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        observation_date: '2026-05-02',
        healed_count: 92,
        failed_count: 8,
        dead_count: 8,
        notes: 'Callus formation visible under plastic wrap',
      });

    expect(res.status).toBe(201);
    expect(res.body.observation.survival_rate).toBe(92);
    expect(res.body.observation.surviving_count).toBe(92);

    // Batch quantity updated to 92
    const graft = await db('batches').where({ id: graftedBatchId }).first();
    expect(graft.current_quantity).toBe(92);
  });

  it('Phase F: READY FOR SALE - Explicit promotion into saleable inventory', async () => {
    const res = await request(app)
      .post('/api/inventory/ready-for-sale/promote')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        grafted_batch_id: graftedBatchId,
        quantity: 80,
        promotion_date: '2026-05-20',
        location: 'Retail Canopy Zone 1',
        notes: 'Vigorously growing grafted saplings approved for sale',
      });

    expect(res.status).toBe(201);
    expect(res.body.batch.serial_number).toMatch(/^(RFS)-\d{4}-\d{4,5}$/);
    rfsBatchId = res.body.batch.id;

    // Remaining graft balance: 92 - 80 = 12
    const graft = await db('batches').where({ id: graftedBatchId }).first();
    expect(graft.current_quantity).toBe(12);
  });

  it('Phase G: SELLING - Record sale, ledger deduction, invoice generation', async () => {
    const res = await request(app)
      .post('/api/sales/orders')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        batch_id: rfsBatchId,
        customer_name: 'Vikramaditya Farmhouse Estates',
        customer_phone: '+91 99887 76655',
        quantity: 30,
        unit_price: 250,
        discount: 500, // (30 * 250) - 500 = 7000
        payment_mode: 'UPI',
        payment_status: 'PAID',
        order_date: '2026-05-25',
        notes: 'Orchard planting bulk order',
      });

    expect(res.status).toBe(201);
    expect(res.body.order.invoice_number).toMatch(/^(SALE)-\d{4}-\d{4,5}$/);
    expect(res.body.order.totalAmount).toBe(7000);
    saleInvoiceNumber = res.body.order.invoice_number;

    // RFS batch stock deducted: 80 - 30 = 50
    const rfs = await db('batches').where({ id: rfsBatchId }).first();
    expect(rfs.current_quantity).toBe(50);
  });

  it('Phase H: TRACEABILITY - Complete backtracking from sale invoice back to sowing', async () => {
    const res = await request(app)
      .get(`/api/trace/${saleInvoiceNumber}`)
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('ORDER');
    expect(res.body.workflowTimeline).toBeDefined();

    const timeline = res.body.workflowTimeline;
    expect(timeline.salesRecords.length).toBeGreaterThan(0);
    expect(timeline.readyForSale).toBeDefined();
    expect(timeline.grafting).toBeDefined();
    expect(timeline.rootstockOrigin).toBeDefined();
    expect(timeline.rootstockOrigin.sowing.variety).toBe('Desi Polyembryonic Mango Rootstock');
    expect(timeline.scionOrigin).toBeDefined();
    expect(timeline.scionOrigin.sowing.variety).toBe('Ratnagiri Alphonso Mango');
    expect(timeline.curingObservations.length).toBeGreaterThan(0);
  });
});
