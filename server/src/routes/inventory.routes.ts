import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import identifierService from '../services/identifier/IdentifierService.js';
import { AuditService } from '../services/audit/AuditService.js';

const router = Router();
router.use(requireAuth);

// 1. GET METADATA (Suppliers, Seed Lots, Mother Trees)
router.get('/suppliers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suppliers = await db('suppliers').where({ is_active: true }).orderBy('name', 'asc');
    return res.json({ suppliers });
  } catch (err) {
    next(err);
  }
});

router.post('/suppliers', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    const [inserted] = await db('suppliers').insert({
      name,
      contact_person,
      phone,
      email,
      address,
      created_at: db.fn.now(),
    }).returning('*');
    return res.status(201).json({ supplier: inserted });
  } catch (err) {
    next(err);
  }
});

router.get('/seed-lots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seedLots = await db('seed_lots')
      .leftJoin('suppliers', 'seed_lots.supplier_id', 'suppliers.id')
      .select('seed_lots.*', 'suppliers.name as supplier_name')
      .where('seed_lots.is_active', true)
      .orderBy('seed_lots.created_at', 'desc');
    return res.json({ seedLots });
  } catch (err) {
    next(err);
  }
});

router.post('/seed-lots', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplier_id, plant_variety, purchase_date, initial_weight_grams, seeds_count, germination_rate_tested, notes } = req.body;

    const prefix = await identifierService.getPrefixForType('SEED_LOT');
    const seq = await identifierService.getNextSequence(`SEED_LOT_${new Date().getFullYear()}`);
    const template = await identifierService.getSerialTemplate();
    const lot_code = identifierService.getStrategy('SERIAL').format(prefix, new Date().getFullYear(), seq, template);

    const [inserted] = await db('seed_lots').insert({
      lot_code,
      supplier_id,
      plant_variety,
      purchase_date,
      initial_weight_grams: initial_weight_grams || 0,
      seeds_count: seeds_count || 0,
      germination_rate_tested: germination_rate_tested || 0,
      notes,
      created_at: db.fn.now(),
    }).returning('*');

    const seedLotId = typeof inserted === 'object' ? inserted.id : inserted;

    await identifierService.generate('SEED_LOT', seedLotId, { customPrefix: prefix });

    return res.status(201).json({ seedLot: inserted, lot_code });
  } catch (err) {
    next(err);
  }
});

router.get('/mother-trees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trees = await db('mother_trees').where({ is_active: true }).orderBy('tree_code', 'asc');
    return res.json({ motherTrees: trees });
  } catch (err) {
    next(err);
  }
});

router.post('/mother-trees', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tree_code, plant_variety, location_block, age_years, health_status, notes } = req.body;
    const [inserted] = await db('mother_trees').insert({
      tree_code,
      plant_variety,
      location_block,
      age_years: age_years || 1,
      health_status: health_status || 'HEALTHY',
      notes,
      created_at: db.fn.now(),
    }).returning('*');
    return res.status(201).json({ motherTree: inserted });
  } catch (err) {
    next(err);
  }
});

// 2. GET BATCHES (with optional filtering by batch_type and status)
router.get('/batches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status } = req.query;
    let query = db('batches').orderBy('created_at', 'desc');

    if (type && type !== 'ALL') {
      query = query.where({ batch_type: type as string });
    }
    if (status && status !== 'ALL') {
      query = query.where({ status: status as string });
    }

    const batches = await query;
    return res.json({ batches });
  } catch (err) {
    next(err);
  }
});

// 3. SOWING WIZARD: Creates ROOTSTOCK Batch + Sowing Record + Ledger Movement
const SowingSchema = z.object({
  seed_lot_id: z.number(),
  seeds_sown: z.number().positive(),
  sowing_date: z.string(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/sowing', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = SowingSchema.parse(req.body);

    const seedLot = await db('seed_lots').where({ id: data.seed_lot_id }).first();
    if (!seedLot) {
      return res.status(404).json({ error: 'Seed lot not found.' });
    }

    const result = await db.transaction(async (trx) => {
      // 1. Create rootstock batch
      const year = new Date().getFullYear();
      const prefix = await identifierService.getPrefixForType('ROOTSTOCK');
      const seq = await identifierService.getNextSequence(`RS_${year}`);
      const template = await identifierService.getSerialTemplate();
      const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      const [batchIdObj] = await trx('batches').insert({
        batch_type: 'ROOTSTOCK',
        serial_number,
        plant_variety: seedLot.plant_variety,
        status: 'ACTIVE',
        initial_quantity: data.seeds_sown,
        current_quantity: data.seeds_sown,
        location: data.location || 'Poly-tunnel Rootstock Bed',
        notes: data.notes || `Sown from ${seedLot.lot_code}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      const batchId = typeof batchIdObj === 'object' ? batchIdObj.id : batchIdObj;

      // 2. Insert into identifiers table
      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: batchId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      // 3. Create sowing record
      await trx('sowing_records').insert({
        batch_id: batchId,
        seed_lot_id: seedLot.id,
        seeds_sown: data.seeds_sown,
        sowing_date: data.sowing_date,
        germination_count: 0,
        live_count: data.seeds_sown,
        mortality_count: 0,
        notes: data.notes,
      });

      // 4. Double-entry ledger movement
      await trx('inventory_movements').insert({
        batch_id: batchId,
        movement_type: 'SOWING',
        quantity_change: data.seeds_sown,
        resulting_balance: data.seeds_sown,
        reference_type: 'SOWING',
        notes: `Initial seed sowing of ${data.seeds_sown} seeds`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      return { batchId, serial_number, quantity: data.seeds_sown };
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'RECORD_SOWING',
      entityType: 'BATCH',
      entityId: result.batchId,
      newValues: result,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: `Saved. ${result.quantity} rootstock seedlings added to batch ${result.serial_number}`,
      batch: result,
    });
  } catch (err) {
    next(err);
  }
});

// 4. SCION HARVEST WIZARD: Creates SCION Batch + Scion Harvest Record + Ledger Movement
const ScionHarvestSchema = z.object({
  mother_tree_id: z.number(),
  cuttings_harvested: z.number().positive(),
  harvest_date: z.string(),
  technician_name: z.string().min(2),
  location: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/scion-harvest', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ScionHarvestSchema.parse(req.body);
    const motherTree = await db('mother_trees').where({ id: data.mother_tree_id }).first();
    if (!motherTree) {
      return res.status(404).json({ error: 'Mother tree donor not found.' });
    }

    const result = await db.transaction(async (trx) => {
      const year = new Date().getFullYear();
      const prefix = await identifierService.getPrefixForType('SCION');
      const seq = await identifierService.getNextSequence(`SC_${year}`);
      const template = await identifierService.getSerialTemplate();
      const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      const [batchIdObj] = await trx('batches').insert({
        batch_type: 'SCION',
        serial_number,
        plant_variety: motherTree.plant_variety,
        status: 'ACTIVE',
        initial_quantity: data.cuttings_harvested,
        current_quantity: data.cuttings_harvested,
        location: data.location || 'Cold Mist Storage',
        notes: data.notes || `Scion harvested from mother tree ${motherTree.tree_code}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      const batchId = typeof batchIdObj === 'object' ? batchIdObj.id : batchIdObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: batchId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      await trx('scion_harvest_records').insert({
        batch_id: batchId,
        mother_tree_id: motherTree.id,
        harvest_date: data.harvest_date,
        cuttings_harvested: data.cuttings_harvested,
        technician_name: data.technician_name,
        notes: data.notes,
      });

      await trx('inventory_movements').insert({
        batch_id: batchId,
        movement_type: 'SCION_HARVEST',
        quantity_change: data.cuttings_harvested,
        resulting_balance: data.cuttings_harvested,
        reference_type: 'SCION_HARVEST',
        notes: `Harvested ${data.cuttings_harvested} budwood cuttings`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      return { batchId, serial_number, quantity: data.cuttings_harvested };
    });

    return res.status(201).json({
      message: `Saved. ${result.quantity} scion cuttings logged in batch ${result.serial_number}`,
      batch: result,
    });
  } catch (err) {
    next(err);
  }
});

// 5. GRAFTING WIZARD: Rootstock + Scion -> GRAFTED Batch with Lineage & Ledger safety
const GraftingSchema = z.object({
  rootstock_batch_id: z.number(),
  scion_batch_id: z.number(),
  quantity_grafted: z.number().positive(),
  grafting_date: z.string(),
  technician_name: z.string().min(2),
  variety_name: z.string().optional(),
  curing_days: z.number().default(21),
  location: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/grafting', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = GraftingSchema.parse(req.body);

    const result = await db.transaction(async (trx) => {
      // Check rootstock batch balance with row lock
      const rootstock = await trx('batches').where({ id: data.rootstock_batch_id }).forUpdate().first();
      if (!rootstock) throw new Error('Rootstock batch not found.');
      if (rootstock.current_quantity < data.quantity_grafted) {
        throw new Error(`Insufficient rootstock seedlings! Available: ${rootstock.current_quantity}, requested: ${data.quantity_grafted}`);
      }

      // Check scion batch balance with row lock
      const scion = await trx('batches').where({ id: data.scion_batch_id }).forUpdate().first();
      if (!scion) throw new Error('Scion batch not found.');
      if (scion.current_quantity < data.quantity_grafted) {
        throw new Error(`Insufficient scion cuttings! Available: ${scion.current_quantity}, requested: ${data.quantity_grafted}`);
      }

      // Deduct from rootstock batch
      const newRootstockBalance = rootstock.current_quantity - data.quantity_grafted;
      await trx('batches').where({ id: rootstock.id }).update({
        current_quantity: newRootstockBalance,
        status: newRootstockBalance === 0 ? 'SOLD_OUT' : rootstock.status,
        updated_at: db.fn.now(),
      });
      await trx('inventory_movements').insert({
        batch_id: rootstock.id,
        movement_type: 'GRAFTING_IN',
        quantity_change: -data.quantity_grafted,
        resulting_balance: newRootstockBalance,
        reference_type: 'GRAFTING',
        notes: `Consumed for grafting batch`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      // Deduct from scion batch
      const newScionBalance = scion.current_quantity - data.quantity_grafted;
      await trx('batches').where({ id: scion.id }).update({
        current_quantity: newScionBalance,
        status: newScionBalance === 0 ? 'SOLD_OUT' : scion.status,
        updated_at: db.fn.now(),
      });
      await trx('inventory_movements').insert({
        batch_id: scion.id,
        movement_type: 'GRAFTING_IN',
        quantity_change: -data.quantity_grafted,
        resulting_balance: newScionBalance,
        reference_type: 'GRAFTING',
        notes: `Consumed for grafting batch`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      // Generate Grafted Batch
      const year = new Date().getFullYear();
      const prefix = await identifierService.getPrefixForType('GRAFTED');
      const seq = await identifierService.getNextSequence(`GR_${year}`);
      const template = await identifierService.getSerialTemplate();
      const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      const variety = data.variety_name || `${scion.plant_variety} on ${rootstock.plant_variety}`;

      const [batchIdObj] = await trx('batches').insert({
        batch_type: 'GRAFTED',
        serial_number,
        plant_variety: variety,
        status: 'CURING',
        initial_quantity: data.quantity_grafted,
        current_quantity: data.quantity_grafted,
        location: data.location || 'Mist Chamber Curing Area',
        notes: data.notes || `Grafted by ${data.technician_name}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      const batchId = typeof batchIdObj === 'object' ? batchIdObj.id : batchIdObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: batchId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      // Never destroy lineage: Record Parent-Child relationships
      await trx('batch_lineage').insert([
        {
          batch_id: batchId,
          parent_batch_id: rootstock.id,
          relationship_type: 'ROOTSTOCK_PARENT',
          notes: `Parent rootstock: ${rootstock.serial_number}`,
          created_at: db.fn.now(),
        },
        {
          batch_id: batchId,
          parent_batch_id: scion.id,
          relationship_type: 'SCION_PARENT',
          notes: `Parent scion: ${scion.serial_number}`,
          created_at: db.fn.now(),
        },
      ]);

      // Grafting record
      await trx('grafting_records').insert({
        batch_id: batchId,
        rootstock_batch_id: rootstock.id,
        scion_batch_id: scion.id,
        technician_name: data.technician_name,
        grafting_date: data.grafting_date,
        quantity_grafted: data.quantity_grafted,
        successful_count: data.quantity_grafted,
        curing_days: data.curing_days,
        notes: data.notes,
      });

      // Output ledger movement
      await trx('inventory_movements').insert({
        batch_id: batchId,
        movement_type: 'GRAFTING_OUT',
        quantity_change: data.quantity_grafted,
        resulting_balance: data.quantity_grafted,
        reference_type: 'GRAFTING',
        notes: `Created from grafting: ${data.quantity_grafted} plants`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      return { batchId, serial_number, quantity: data.quantity_grafted };
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'RECORD_GRAFTING',
      entityType: 'BATCH',
      entityId: result.batchId,
      newValues: result,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: `Saved. ${result.quantity} plants grafted and logged in batch ${result.serial_number}`,
      batch: result,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Grafting operation failed.' });
  }
});

// 6. CURING & MORTALITY WIZARD
const MortalitySchema = z.object({
  batch_id: z.number(),
  mortality_count: z.number().min(1),
  cause_of_death: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/mortality', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batch_id, mortality_count, cause_of_death, notes } = MortalitySchema.parse(req.body);

    const result = await db.transaction(async (trx) => {
      const batch = await trx('batches').where({ id: batch_id }).forUpdate().first();
      if (!batch) throw new Error('Batch not found.');
      if (batch.current_quantity < mortality_count) {
        throw new Error(`Mortality count (${mortality_count}) cannot exceed current batch balance (${batch.current_quantity})`);
      }

      const newBalance = batch.current_quantity - mortality_count;
      await trx('batches').where({ id: batch.id }).update({
        current_quantity: newBalance,
        status: newBalance === 0 ? 'SOLD_OUT' : batch.status,
        updated_at: db.fn.now(),
      });

      await trx('curing_mortality_records').insert({
        batch_id: batch.id,
        record_type: 'MORTALITY_LOG',
        healthy_count: newBalance,
        mortality_count,
        cause_of_death: cause_of_death || 'Desiccation / fungal infection',
        logged_by_user_id: req.user!.id,
        notes,
      });

      await trx('inventory_movements').insert({
        batch_id: batch.id,
        movement_type: 'MORTALITY',
        quantity_change: -mortality_count,
        resulting_balance: newBalance,
        reference_type: 'MORTALITY',
        notes: `Recorded mortality of ${mortality_count} units. Cause: ${cause_of_death || 'General'}`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      return { batch, newBalance };
    });

    return res.json({
      message: `Saved. ${mortality_count} losses deducted. Remaining in ${result.batch.serial_number}: ${result.newBalance} plants.`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 7. PROMOTE TO READY-FOR-SALE WIZARD
const PromoteSchema = z.object({
  grafted_batch_id: z.number(),
  quantity: z.number().positive(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/promote-ready', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { grafted_batch_id, quantity, location, notes } = PromoteSchema.parse(req.body);

    const result = await db.transaction(async (trx) => {
      const sourceBatch = await trx('batches').where({ id: grafted_batch_id }).forUpdate().first();
      if (!sourceBatch) throw new Error('Source batch not found.');
      if (sourceBatch.current_quantity < quantity) {
        throw new Error(`Quantity to promote (${quantity}) exceeds available balance (${sourceBatch.current_quantity}).`);
      }

      // Deduct from source batch
      const newSourceBalance = sourceBatch.current_quantity - quantity;
      await trx('batches').where({ id: sourceBatch.id }).update({
        current_quantity: newSourceBalance,
        status: newSourceBalance === 0 ? 'SOLD_OUT' : sourceBatch.status,
        updated_at: db.fn.now(),
      });

      await trx('inventory_movements').insert({
        batch_id: sourceBatch.id,
        movement_type: 'READY_PROMOTION',
        quantity_change: -quantity,
        resulting_balance: newSourceBalance,
        reference_type: 'BATCH_PROMOTION',
        notes: `Promoted ${quantity} plants to Ready-for-Sale`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      // Generate Ready-For-Sale Batch
      const year = new Date().getFullYear();
      const prefix = await identifierService.getPrefixForType('READY_FOR_SALE');
      const seq = await identifierService.getNextSequence(`RFS_${year}`);
      const template = await identifierService.getSerialTemplate();
      const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      const [rfsIdObj] = await trx('batches').insert({
        batch_type: 'READY_FOR_SALE',
        serial_number,
        plant_variety: sourceBatch.plant_variety,
        status: 'READY',
        initial_quantity: quantity,
        current_quantity: quantity,
        location: location || 'Dispatch Hardening Yard',
        notes: notes || `Promoted from ${sourceBatch.serial_number}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      const rfsId = typeof rfsIdObj === 'object' ? rfsIdObj.id : rfsIdObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: rfsId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      // Lineage connection
      await trx('batch_lineage').insert({
        batch_id: rfsId,
        parent_batch_id: sourceBatch.id,
        relationship_type: 'PROMOTED_FROM',
        notes: `Promoted from batch ${sourceBatch.serial_number}`,
        created_at: db.fn.now(),
      });

      await trx('inventory_movements').insert({
        batch_id: rfsId,
        movement_type: 'READY_PROMOTION',
        quantity_change: quantity,
        resulting_balance: quantity,
        reference_type: 'BATCH_PROMOTION',
        notes: `Initial balance of Ready-for-Sale batch`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      return { rfsId, serial_number, quantity };
    });

    return res.status(201).json({
      message: `Saved. ${result.quantity} plants promoted to Ready-for-Sale batch ${result.serial_number}`,
      batch: result,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 8. GET INVENTORY MOVEMENTS (Ledger Audit Log)
router.get('/movements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batch_id, limit = '50' } = req.query;
    let query = db('inventory_movements')
      .join('batches', 'inventory_movements.batch_id', 'batches.id')
      .leftJoin('users', 'inventory_movements.created_by_user_id', 'users.id')
      .select(
        'inventory_movements.*',
        'batches.serial_number',
        'batches.plant_variety',
        'users.full_name as author_name'
      )
      .orderBy('inventory_movements.created_at', 'desc')
      .limit(Math.min(100, parseInt(limit as string, 10) || 50));

    if (batch_id) {
      query = query.where('inventory_movements.batch_id', batch_id);
    }

    const movements = await query;
    return res.json({ movements });
  } catch (err) {
    next(err);
  }
});

export default router;

