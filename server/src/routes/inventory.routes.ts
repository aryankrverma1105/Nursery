import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import identifierService from '../services/identifier/IdentifierService.js';
import { AuditService } from '../services/audit/AuditService.js';
import { invalidatePublicCache } from './public.routes.js';

const router = Router();
router.use(requireAuth);

// ==========================================
// 1. METADATA: Suppliers, Seed Lots, Mother Trees
// ==========================================
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
    const { lot_code, supplier_id, plant_variety, purchase_date, seeds_count, notes } = req.body;
    const [inserted] = await db('seed_lots').insert({
      lot_code: lot_code || `LOT-${Date.now().toString().slice(-6)}`,
      supplier_id: supplier_id || null,
      plant_variety,
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      seeds_count: seeds_count || 0,
      notes,
      created_at: db.fn.now(),
    }).returning('*');
    return res.status(201).json({ seedLot: inserted });
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

// ==========================================
// 2. GENERAL BATCHES LIST & DISCARD
// ==========================================
router.get('/batches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, includeDiscarded } = req.query;
    let query = db('batches').orderBy('created_at', 'desc');

    if (includeDiscarded !== 'true' && status !== 'DISCARDED') {
      query = query.whereNot({ status: 'DISCARDED' });
    }

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

router.delete('/batches/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason = 'Manual stock write-off / discard' } = req.body;

    const batch = await db('batches').where({ id }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    await db.transaction(async (trx) => {
      if (batch.current_quantity > 0) {
        await trx('inventory_movements').insert({
          batch_id: id,
          movement_type: 'MORTALITY_LOSS',
          quantity_change: -batch.current_quantity,
          resulting_balance: 0,
          reference_type: 'DISCARD_ADJUSTMENT',
          reference_id: String(id),
          notes: `Batch discarded: ${reason}`,
          created_by_user_id: req.user!.id,
          created_at: db.fn.now(),
        });
      }

      await trx('batches').where({ id }).update({
        status: 'DISCARDED',
        current_quantity: 0,
        notes: batch.notes ? `${batch.notes} | Discarded: ${reason}` : `Discarded: ${reason}`,
        updated_at: db.fn.now(),
      });

      await trx('product_batch_links').where({ batch_id: id }).delete();

      await trx('identifiers').where({ entity_type: 'BATCH', entity_id: id }).update({
        status: 'RETIRED',
        retired_at: db.fn.now(),
      });
    });

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'DELETE_BATCH',
      entityType: 'BATCH',
      entityId: String(id),
      oldValues: {
        serial_number: batch.serial_number,
        plant_variety: batch.plant_variety,
        current_quantity: batch.current_quantity,
        status: batch.status,
      },
      newValues: { status: 'DISCARDED', current_quantity: 0, reason },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Batch ${batch.serial_number} (${batch.plant_variety}) successfully discarded from inventory.`,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. PHASE A: SOWING (Designated for Rootstock, Scion, or Both)
// ==========================================
router.get('/sowing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await db('batches')
      .whereIn('batch_type', ['ROOTSTOCK', 'SCION', 'BOTH', 'SEEDLING', 'SOWN'])
      .whereNot('status', 'DISCARDED')
      .leftJoin('sowing_records', 'batches.id', 'sowing_records.batch_id')
      .leftJoin('suppliers', 'sowing_records.supplier_id', 'suppliers.id')
      .select(
        'batches.*',
        'sowing_records.seeds_sown',
        'sowing_records.sowing_date',
        'sowing_records.seed_source',
        'sowing_records.seed_name as sowing_seed_name',
        'sowing_records.designation as sowing_designation',
        'sowing_records.plant_type as sowing_plant_type',
        'suppliers.name as supplier_name'
      )
      .orderBy('batches.created_at', 'desc');

    return res.json({ batches });
  } catch (err) {
    next(err);
  }
});

router.post('/sowing', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let {
      seed_name,
      variety,
      designation,
      types = [],
      sowing_date,
      supplier_id,
      seed_source,
      location,
      notes,
      rootstock,
      scion,
      seed_lot_id,
      seeds_sown,
      plant_type,
    } = req.body;

    // 1. Resolve seed identity & lot
    const lot = seed_lot_id ? await db('seed_lots').where({ id: seed_lot_id }).first() : null;
    const varietyCandidate = (
      seed_name ||
      variety ||
      rootstock?.variety ||
      scion?.variety ||
      lot?.plant_variety ||
      ''
    ).toUpperCase();

    // 2. Resolve designation (ROOTSTOCK, SCION, or BOTH)
    let finalDesignation: 'ROOTSTOCK' | 'SCION' | 'BOTH' = 'BOTH';
    if (designation) {
      const d = String(designation).toUpperCase();
      if (d === 'ROOTSTOCK' || d === 'SCION' || d === 'BOTH') {
        finalDesignation = d;
      }
    } else if (Array.isArray(types) && types.length > 0) {
      const hasRoot = types.includes('ROOTSTOCK');
      const hasScion = types.includes('SCION');
      if (hasRoot && hasScion) {
        finalDesignation = 'BOTH';
      } else if (hasRoot) {
        finalDesignation = 'ROOTSTOCK';
      } else if (hasScion) {
        finalDesignation = 'SCION';
      }
    } else if (plant_type) {
      finalDesignation = plant_type.toUpperCase().includes('SCION') ? 'SCION' : 'ROOTSTOCK';
    } else if (varietyCandidate.includes('ROOTSTOCK')) {
      finalDesignation = 'ROOTSTOCK';
    } else if (varietyCandidate.includes('SCION')) {
      finalDesignation = 'SCION';
    }

    // 3. Resolve seed name and variety (actual seed identity independent of designation)
    const resolvedSeedName = (
      seed_name ||
      variety ||
      rootstock?.variety ||
      scion?.variety ||
      lot?.plant_variety ||
      'Certified Seed'
    ).trim();

    const resolvedVariety = (
      variety ||
      seed_name ||
      rootstock?.variety ||
      scion?.variety ||
      resolvedSeedName
    ).trim();

    // 3. Resolve seeds sown count (single physical count without duplication)
    let totalSeeds = Number(seeds_sown);
    if (!totalSeeds || totalSeeds <= 0) {
      if (rootstock?.seeds_sown && scion?.seeds_sown) {
        // Fallback for legacy requests passing separate objects
        totalSeeds = Number(rootstock.seeds_sown) + Number(scion.seeds_sown);
      } else if (rootstock?.seeds_sown) {
        totalSeeds = Number(rootstock.seeds_sown);
      } else if (scion?.seeds_sown) {
        totalSeeds = Number(scion.seeds_sown);
      }
    }

    if (isNaN(totalSeeds) || totalSeeds <= 0) {
      return res.status(400).json({ error: 'Please enter a valid number of seeds sown (> 0).' });
    }

    const sowDate = sowing_date || new Date().toISOString().split('T')[0];
    const year = new Date(sowDate).getFullYear();
    const template = await identifierService.getSerialTemplate();

    // 4. Determine prefix and allocate sequence for this single physical batch
    let prefixType = 'BOTH';
    if (finalDesignation === 'ROOTSTOCK') prefixType = 'ROOTSTOCK';
    else if (finalDesignation === 'SCION') prefixType = 'SCION';

    let createdBatch: any = null;

    await db.transaction(async (trx) => {
      const prefix = await identifierService.getPrefixForType(prefixType);
      const seq = await identifierService.getNextSequence(`${prefix}_${year}`);
      const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      const batchTypeVal = finalDesignation === 'BOTH' ? 'BOTH' : finalDesignation;

      const [bIdObj] = await trx('batches').insert({
        serial_number,
        batch_type: batchTypeVal,
        designation: finalDesignation,
        seed_name: resolvedSeedName,
        plant_variety: resolvedVariety,
        status: 'SOWN',
        stage: 'SOWN',
        initial_quantity: totalSeeds,
        current_quantity: totalSeeds,
        consumed_as_rootstock: 0,
        consumed_as_scion: 0,
        location: location || rootstock?.location || scion?.location || 'Nursery Tray Block',
        notes: notes || rootstock?.notes || scion?.notes || `Sown for designation: ${finalDesignation}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      const bId = typeof bIdObj === 'object' ? bIdObj.id : bIdObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: bId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      await trx('sowing_records').insert({
        batch_id: bId,
        seed_name: resolvedSeedName,
        variety: resolvedVariety,
        plant_type: finalDesignation,
        designation: finalDesignation,
        seed_lot_id: seed_lot_id || rootstock?.seed_lot_id || scion?.seed_lot_id || null,
        seed_source: seed_source || 'Certified Supplier',
        seeds_sown: totalSeeds,
        sowing_date: sowDate,
        location: location || 'Nursery Tray Block',
        notes: notes,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      await trx('inventory_movements').insert({
        batch_id: bId,
        movement_type: 'SOWING',
        quantity_change: totalSeeds,
        resulting_balance: totalSeeds,
        reference_type: 'SOWING',
        notes: `Initial sowing of ${totalSeeds} seeds (${resolvedSeedName}) designated for ${finalDesignation}`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      createdBatch = {
        id: bId,
        batchId: bId,
        serial_number,
        batch_type: batchTypeVal,
        designation: finalDesignation,
        seed_name: resolvedSeedName,
        plant_variety: resolvedVariety,
        variety: resolvedVariety,
        seeds_sown: totalSeeds,
        current_quantity: totalSeeds,
        initial_quantity: totalSeeds,
        location: location || 'Nursery Tray Block',
      };
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'SOWING_CREATED',
      entityType: 'SOWING',
      newValues: { batch: createdBatch, designation: finalDesignation },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Successfully registered sowing batch ${createdBatch.serial_number} (${resolvedSeedName}) for ${finalDesignation}.`,
      batch: createdBatch,
      batches: [createdBatch], // maintains backwards compatibility
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. PHASE B: GERMINATION TRACKING
// ==========================================
router.get('/germination', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await db('batches')
      .whereIn('batch_type', ['ROOTSTOCK', 'SCION', 'BOTH', 'SEEDLING', 'SOWN'])
      .whereNot('status', 'DISCARDED')
      .leftJoin('sowing_records', 'batches.id', 'sowing_records.batch_id')
      .select(
        'batches.*',
        'sowing_records.seeds_sown',
        'sowing_records.sowing_date',
        'sowing_records.seed_source',
        'sowing_records.seed_name as sowing_seed_name',
        'sowing_records.designation as sowing_designation',
        'sowing_records.plant_type as sowing_plant_type'
      )
      .orderBy('batches.created_at', 'desc');

    const result = await Promise.all(
      batches.map(async (b) => {
        const latestObs = await db('germination_observations')
          .where({ batch_id: b.id })
          .orderBy('observation_date', 'desc')
          .first();

        const countObs = await db('germination_observations')
          .where({ batch_id: b.id })
          .count('id as count')
          .first();

        const totalSeeds = b.seeds_sown || b.initial_quantity;
        const germinated = latestObs ? latestObs.germinated_count : 0;
        const viable = latestObs ? latestObs.viable_seedlings_count : b.current_quantity;
        const rate = latestObs ? latestObs.germination_rate : 0;

        return {
          ...b,
          total_seeds: totalSeeds,
          germinated_quantity: germinated,
          remaining_viable_seedlings: viable,
          germination_percentage: rate,
          observation_count: parseInt(String(countObs?.count || '0'), 10),
          latest_observation: latestObs || null,
        };
      })
    );

    return res.json({ batches: result });
  } catch (err) {
    next(err);
  }
});

router.post('/germination/:batchId', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const { observation_date, total_seeds_sown, germinated_count, non_germinated_count = 0, damaged_dead_count = 0, notes } = req.body;

    const batch = await db('batches').where({ id: batchId }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    const sowRecord = await db('sowing_records').where({ batch_id: batchId }).first();
    const totalSeeds = total_seeds_sown || sowRecord?.seeds_sown || batch.initial_quantity;

    const germCount = Number(germinated_count);
    const nonGermCount = Number(non_germinated_count || 0);
    const deadCount = Number(damaged_dead_count || 0);

    if (isNaN(germCount) || germCount < 0) {
      return res.status(400).json({ error: 'Germinated seeds count must be a non-negative number.' });
    }

    if (germCount > totalSeeds) {
      return res.status(400).json({ error: `Germinated quantity (${germCount}) cannot exceed total seeds sown (${totalSeeds}).` });
    }

    const viableSeedlings = Math.max(0, germCount - deadCount);
    const germRate = totalSeeds > 0 ? parseFloat(((germCount / totalSeeds) * 100).toFixed(1)) : 0;
    const obsDate = observation_date || new Date().toISOString().split('T')[0];

    let insertedObsId: number | null = null;

    await db.transaction(async (trx) => {
      // 1. Insert dated observation record (never overwrites history!)
      const [idObj] = await trx('germination_observations').insert({
        batch_id: batchId,
        observation_date: obsDate,
        total_seeds_sown: totalSeeds,
        germinated_count: germCount,
        non_germinated_count: nonGermCount,
        damaged_dead_count: deadCount,
        viable_seedlings_count: viableSeedlings,
        germination_rate: germRate,
        notes: notes || null,
        recorded_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      }).returning('id');

      insertedObsId = typeof idObj === 'object' ? idObj.id : idObj;

      // 2. Update batch current quantity and status
      const prevQty = batch.current_quantity;
      const newStatus = batch.status === 'SOWN' ? 'GERMINATED' : batch.status;

      await trx('batches').where({ id: batchId }).update({
        current_quantity: viableSeedlings,
        status: newStatus,
        stage: 'GERMINATED',
        updated_at: db.fn.now(),
      });

      // 3. Write inventory movement ledger entry
      await trx('inventory_movements').insert({
        batch_id: batchId,
        movement_type: 'GERMINATION',
        quantity_change: viableSeedlings - prevQty,
        resulting_balance: viableSeedlings,
        reference_type: 'GERMINATION',
        reference_id: String(insertedObsId),
        notes: `Germination observation: ${germCount} germinated (${germRate}%), ${viableSeedlings} viable seedlings`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'GERMINATION_RECORDED',
      entityType: 'GERMINATION',
      entityId: String(batchId),
      newValues: { germCount, deadCount, viableSeedlings, germRate, obsDate },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Germination recorded: ${germRate}% (${viableSeedlings} viable plants).`,
      observation: {
        id: insertedObsId,
        batch_id: batchId,
        observation_date: obsDate,
        total_seeds_sown: totalSeeds,
        germinated_count: germCount,
        non_germinated_count: nonGermCount,
        damaged_dead_count: deadCount,
        viable_seedlings_count: viableSeedlings,
        germination_rate: germRate,
        notes: notes || null,
      },
      viable_seedlings: viableSeedlings,
      germination_rate: germRate,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/germination/:batchId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const history = await db('germination_observations')
      .where({ batch_id: batchId })
      .orderBy('observation_date', 'asc');

    return res.json({ history });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. PHASE C: PLANT GROWTH TRACKING
// ==========================================
router.get('/growth', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await db('batches')
      .whereIn('batch_type', ['ROOTSTOCK', 'SCION', 'BOTH', 'SEEDLING', 'SOWN'])
      .whereNot('status', 'DISCARDED')
      .leftJoin('sowing_records', 'batches.id', 'sowing_records.batch_id')
      .select(
        'batches.*',
        'sowing_records.seeds_sown',
        'sowing_records.sowing_date',
        'sowing_records.seed_name as sowing_seed_name',
        'sowing_records.designation as sowing_designation'
      )
      .orderBy('batches.created_at', 'desc');

    const result = await Promise.all(
      batches.map(async (b) => {
        const latestLog = await db('plant_growth_logs')
          .where({ batch_id: b.id })
          .orderBy('log_date', 'desc')
          .first();

        const logsCount = await db('plant_growth_logs')
          .where({ batch_id: b.id })
          .count('id as count')
          .first();

        return {
          ...b,
          growth_status: b.status,
          log_count: parseInt(String(logsCount?.count || '0'), 10),
          latest_log: latestLog || null,
        };
      })
    );

    return res.json({ batches: result });
  } catch (err) {
    next(err);
  }
});

router.post('/growth/:batchId/status', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const { new_status, log_date, notes } = req.body;

    const batch = await db('batches').where({ id: batchId }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    if (!new_status) {
      return res.status(400).json({ error: 'New status is required.' });
    }

    const dateVal = log_date || new Date().toISOString().split('T')[0];

    await db.transaction(async (trx) => {
      await trx('batches').where({ id: batchId }).update({
        status: new_status,
        stage: new_status,
        updated_at: db.fn.now(),
      });

      await trx('plant_growth_logs').insert({
        batch_id: batchId,
        log_date: dateVal,
        previous_status: batch.status,
        new_status,
        previous_quantity: batch.current_quantity,
        quantity_change: 0,
        new_quantity: batch.current_quantity,
        reason: 'Status Advancement',
        notes: notes || null,
        recorded_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'GROWTH_STATUS_UPDATED',
      entityType: 'GROWTH',
      entityId: String(batchId),
      oldValues: { status: batch.status },
      newValues: { status: new_status },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Batch ${batch.serial_number} updated to status "${new_status}".`,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/growth/:batchId/loss', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const { loss_quantity, log_date, reason, notes } = req.body;

    const lossQty = Number(loss_quantity);
    if (isNaN(lossQty) || lossQty <= 0) {
      return res.status(400).json({ error: 'Loss quantity must be a positive number.' });
    }

    const batch = await db('batches').where({ id: batchId }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    if (lossQty > batch.current_quantity) {
      return res.status(400).json({
        error: `Loss quantity (${lossQty}) exceeds current available quantity (${batch.current_quantity}).`,
      });
    }

    const newQty = batch.current_quantity - lossQty;
    const dateVal = log_date || new Date().toISOString().split('T')[0];

    await db.transaction(async (trx) => {
      await trx('batches').where({ id: batchId }).update({
        current_quantity: newQty,
        updated_at: db.fn.now(),
      });

      await trx('plant_growth_logs').insert({
        batch_id: batchId,
        log_date: dateVal,
        previous_status: batch.status,
        new_status: batch.status,
        previous_quantity: batch.current_quantity,
        quantity_change: -lossQty,
        new_quantity: newQty,
        reason: reason || 'Mortality / Loss',
        notes: notes || null,
        recorded_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      await trx('inventory_movements').insert({
        batch_id: batchId,
        movement_type: 'MORTALITY',
        quantity_change: -lossQty,
        resulting_balance: newQty,
        reference_type: 'GROWTH_LOSS',
        notes: `Plant growth loss: ${lossQty} plants lost (${reason || 'mortality'})`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'GROWTH_LOSS_RECORDED',
      entityType: 'GROWTH',
      entityId: String(batchId),
      newValues: { lossQty, newQty, reason },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Recorded ${lossQty} plants lost. Remaining balance: ${newQty}.`,
      new_quantity: newQty,
      remaining_quantity: newQty,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/growth/:batchId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const history = await db('plant_growth_logs')
      .where({ batch_id: batchId })
      .orderBy('log_date', 'asc');

    return res.json({ history });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. PHASE D: GRAFTING
// ==========================================
router.get('/grafting/eligible-batches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Eligible Rootstocks: batches designated ROOTSTOCK or BOTH with viable stock
    const rootstocks = await db('batches')
      .where(function() {
        this.whereIn('designation', ['ROOTSTOCK', 'BOTH'])
            .orWhere('batch_type', 'ROOTSTOCK');
      })
      .whereIn('status', ['READY_FOR_GRAFTING', 'Ready for Grafting', 'ACTIVE', 'GERMINATED', 'GROWING', 'PARTIALLY_USED', 'SOWN'])
      .where('current_quantity', '>', 0)
      .orderBy('created_at', 'desc');

    // Eligible Scions: batches designated SCION or BOTH with viable stock
    const scions = await db('batches')
      .where(function() {
        this.whereIn('designation', ['SCION', 'BOTH'])
            .orWhere('batch_type', 'SCION');
      })
      .whereIn('status', ['READY_FOR_GRAFTING', 'Ready for Grafting', 'ACTIVE', 'GERMINATED', 'GROWING', 'PARTIALLY_USED', 'SOWN'])
      .where('current_quantity', '>', 0)
      .orderBy('created_at', 'desc');

    return res.json({ rootstocks, scions });
  } catch (err) {
    next(err);
  }
});

router.get('/grafting', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grafts = await db('batches')
      .where({ batch_type: 'GRAFTED' })
      .whereNot('status', 'DISCARDED')
      .leftJoin('grafting_records', 'batches.id', 'grafting_records.batch_id')
      .select(
        'batches.*',
        'grafting_records.rootstock_batch_id',
        'grafting_records.scion_batch_id',
        'grafting_records.technician_name',
        'grafting_records.grafting_date',
        'grafting_records.quantity_grafted'
      )
      .orderBy('batches.created_at', 'desc');

    const result = await Promise.all(
      grafts.map(async (g) => {
        const rootstock = g.rootstock_batch_id ? await db('batches').where({ id: g.rootstock_batch_id }).first() : null;
        const scion = g.scion_batch_id ? await db('batches').where({ id: g.scion_batch_id }).first() : null;
        const latestCuring = await db('curing_survival_observations').where({ batch_id: g.id }).orderBy('observation_date', 'desc').first();

        return {
          ...g,
          rootstock_serial: rootstock?.serial_number || 'N/A',
          rootstock_variety: rootstock?.plant_variety || 'Rootstock',
          scion_serial: scion?.serial_number || 'N/A',
          scion_variety: scion?.plant_variety || 'Scion',
          survival_rate: latestCuring?.survival_rate || 100,
          healed_count: latestCuring?.healed_count || g.current_quantity,
        };
      })
    );

    return res.json({ grafts: result });
  } catch (err) {
    next(err);
  }
});

const handleGrafting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rootstock_batch_id, scion_batch_id, grafting_date, quantity_grafted, technician_name, grafting_method, notes } = req.body;

    const qty = Number(quantity_grafted);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity of grafts attempted must be a positive number.' });
    }

    if (!rootstock_batch_id || !scion_batch_id) {
      return res.status(400).json({ error: 'Both Rootstock batch and Scion batch must be selected.' });
    }

    const isSameBatch = String(rootstock_batch_id) === String(scion_batch_id);
    let createdGraftBatch: any = null;

    await db.transaction(async (trx) => {
      let rootstock: any;
      let scion: any;

      if (isSameBatch) {
        // Single physical batch serving as both Rootstock and Scion
        const batch = await trx('batches').where({ id: rootstock_batch_id }).forUpdate().first();
        if (!batch) {
          throw new Error('Selected batch not found.');
        }
        const neededQty = qty * 2;
        if (batch.current_quantity < neededQty) {
          throw new Error(
            `Insufficient plant balance in ${batch.serial_number}. Attempting ${qty} grafts requires ${qty} Rootstock + ${qty} Scion (total ${neededQty} plants), but only ${batch.current_quantity} available.`
          );
        }

        const newQty = batch.current_quantity - neededQty;
        const newStatus = newQty === 0 ? 'FULLY_USED' : 'PARTIALLY_USED';

        await trx('batches').where({ id: batch.id }).update({
          current_quantity: newQty,
          consumed_as_rootstock: (batch.consumed_as_rootstock || 0) + qty,
          consumed_as_scion: (batch.consumed_as_scion || 0) + qty,
          status: newStatus,
          updated_at: db.fn.now(),
        });

        await trx('inventory_movements').insert([
          {
            batch_id: batch.id,
            movement_type: 'GRAFTING_IN',
            quantity_change: -qty,
            resulting_balance: batch.current_quantity - qty,
            reference_type: 'GRAFTING',
            notes: `Consumed ${qty} plants as Rootstock for grafting`,
            created_by_user_id: req.user!.id,
            created_at: db.fn.now(),
          },
          {
            batch_id: batch.id,
            movement_type: 'GRAFTING_IN',
            quantity_change: -qty,
            resulting_balance: newQty,
            reference_type: 'GRAFTING',
            notes: `Consumed ${qty} plants as Scion for grafting`,
            created_by_user_id: req.user!.id,
            created_at: db.fn.now(),
          },
        ]);

        rootstock = batch;
        scion = batch;
      } else {
        // Distinct physical batches
        rootstock = await trx('batches').where({ id: rootstock_batch_id }).forUpdate().first();
        if (!rootstock) {
          throw new Error('Selected Rootstock batch not found.');
        }
        if (rootstock.current_quantity < qty) {
          throw new Error(`Insufficient Rootstock balance. Available: ${rootstock.current_quantity}, requested: ${qty}.`);
        }

        scion = await trx('batches').where({ id: scion_batch_id }).forUpdate().first();
        if (!scion) {
          throw new Error('Selected Scion batch not found.');
        }
        if (scion.current_quantity < qty) {
          throw new Error(`Insufficient Scion balance. Available: ${scion.current_quantity}, requested: ${qty}.`);
        }

        // Deduct Rootstock
        const newRootstockQty = rootstock.current_quantity - qty;
        const rootstockStatus = newRootstockQty === 0 ? 'FULLY_USED' : 'PARTIALLY_USED';
        await trx('batches').where({ id: rootstock_batch_id }).update({
          current_quantity: newRootstockQty,
          consumed_as_rootstock: (rootstock.consumed_as_rootstock || 0) + qty,
          status: rootstockStatus,
          updated_at: db.fn.now(),
        });

        await trx('inventory_movements').insert({
          batch_id: rootstock_batch_id,
          movement_type: 'GRAFTING_IN',
          quantity_change: -qty,
          resulting_balance: newRootstockQty,
          reference_type: 'GRAFTING',
          notes: `Consumed ${qty} plants as Rootstock for grafting`,
          created_by_user_id: req.user!.id,
          created_at: db.fn.now(),
        });

        // Deduct Scion
        const newScionQty = scion.current_quantity - qty;
        const scionStatus = newScionQty === 0 ? 'FULLY_USED' : 'PARTIALLY_USED';
        await trx('batches').where({ id: scion_batch_id }).update({
          current_quantity: newScionQty,
          consumed_as_scion: (scion.consumed_as_scion || 0) + qty,
          status: scionStatus,
          updated_at: db.fn.now(),
        });

        await trx('inventory_movements').insert({
          batch_id: scion_batch_id,
          movement_type: 'GRAFTING_IN',
          quantity_change: -qty,
          resulting_balance: newScionQty,
          reference_type: 'GRAFTING',
          notes: `Consumed ${qty} plants as Scion for grafting`,
          created_by_user_id: req.user!.id,
          created_at: db.fn.now(),
        });
      }

      // Generate Grafted Batch
      const graftDateVal = grafting_date || new Date().toISOString().split('T')[0];
      const year = new Date(graftDateVal).getFullYear();
      const prefix = await identifierService.getPrefixForType('GRAFTED');
      const seq = await identifierService.getNextSequence(`GRAFT_${year}`);
      const template = await identifierService.getSerialTemplate();
      const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      const combinedVariety = isSameBatch
        ? `${scion.plant_variety} (Self-Grafted)`
        : `${scion.plant_variety} (on ${rootstock.plant_variety})`;

      const [gIdObj] = await trx('batches').insert({
        batch_type: 'GRAFTED',
        serial_number,
        plant_variety: combinedVariety,
        status: 'CURING',
        stage: 'CURING',
        initial_quantity: qty,
        current_quantity: qty,
        location: 'Acclimatization Curing Chamber',
        notes: notes || `Grafted using ${grafting_method || 'Cleft Grafting'} by ${technician_name || 'Staff'}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      const gId = typeof gIdObj === 'object' ? gIdObj.id : gIdObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: gId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      // Link permanently to parent batch(es)
      if (isSameBatch) {
        await trx('batch_lineage').insert({
          batch_id: gId,
          parent_batch_id: rootstock_batch_id,
          relationship_type: 'DUAL_PARENT',
          notes: `Dual Rootstock & Scion donor ${rootstock.serial_number}`,
          created_at: db.fn.now(),
        });
      } else {
        await trx('batch_lineage').insert([
          {
            batch_id: gId,
            parent_batch_id: rootstock_batch_id,
            relationship_type: 'ROOTSTOCK_PARENT',
            notes: `Rootstock donor ${rootstock.serial_number}`,
            created_at: db.fn.now(),
          },
          {
            batch_id: gId,
            parent_batch_id: scion_batch_id,
            relationship_type: 'SCION_PARENT',
            notes: `Scion donor ${scion.serial_number}`,
            created_at: db.fn.now(),
          },
        ]);
      }

      // Record in grafting_records
      await trx('grafting_records').insert({
        batch_id: gId,
        rootstock_batch_id,
        scion_batch_id,
        technician_name: technician_name || 'Staff',
        grafting_date: graftDateVal,
        quantity_grafted: qty,
        successful_count: qty,
        failed_count: 0,
        survival_rate: 100,
        notes: notes || 'Graft run created',
      });

      await trx('inventory_movements').insert({
        batch_id: gId,
        movement_type: 'GRAFTING_OUT',
        quantity_change: qty,
        resulting_balance: qty,
        reference_type: 'GRAFTING',
        notes: `Initial created grafted batch of ${qty} plants`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      createdGraftBatch = {
        id: gId,
        batchId: gId,
        serial_number,
        plant_variety: combinedVariety,
        quantity_grafted: qty,
        grafting_date: graftDateVal,
      };
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'GRAFTING_CREATED',
      entityType: 'GRAFTING',
      newValues: { graft: createdGraftBatch },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Successfully created graft run ${createdGraftBatch.serial_number} (${qty} plants).`,
      graft: createdGraftBatch,
      batch: createdGraftBatch,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Grafting execution failed.' });
  }
};

router.post('/grafting', requirePermission('INVENTORY_WRITE'), handleGrafting);

// ==========================================
// 7. PHASE E: CURING & SURVIVAL
// ==========================================
router.get('/curing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grafts = await db('batches')
      .where({ batch_type: 'GRAFTED' })
      .whereNot('status', 'DISCARDED')
      .leftJoin('grafting_records', 'batches.id', 'grafting_records.batch_id')
      .select(
        'batches.*',
        'grafting_records.quantity_grafted as total_grafted',
        'grafting_records.grafting_date',
        'grafting_records.technician_name'
      )
      .orderBy('batches.created_at', 'desc');

    const result = await Promise.all(
      grafts.map(async (g) => {
        const latestObs = await db('curing_survival_observations')
          .where({ batch_id: g.id })
          .orderBy('observation_date', 'desc')
          .first();

        const countObs = await db('curing_survival_observations')
          .where({ batch_id: g.id })
          .count('id as count')
          .first();

        const totalAttempted = g.total_grafted || g.initial_quantity;
        const rate = latestObs ? latestObs.survival_rate : 100;
        const healed = latestObs ? latestObs.healed_count : g.current_quantity;
        const failed = latestObs ? latestObs.failed_count : 0;
        const dead = latestObs ? latestObs.dead_count : 0;

        return {
          ...g,
          total_grafted: totalAttempted,
          healed_count: healed,
          failed_count: failed,
          dead_count: dead,
          surviving_quantity: g.current_quantity,
          survival_rate: rate,
          observation_count: parseInt(String(countObs?.count || '0'), 10),
          latest_observation: latestObs || null,
        };
      })
    );

    return res.json({ batches: result });
  } catch (err) {
    next(err);
  }
});

router.post('/curing/:batchId/observation', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const { observation_date, healed_count, failed_count = 0, dead_count = 0, notes } = req.body;

    const batch = await db('batches').where({ id: batchId }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Grafted batch not found.' });
    }

    const graftRecord = await db('grafting_records').where({ batch_id: batchId }).first();
    const totalAttempted = graftRecord?.quantity_grafted || batch.initial_quantity;

    const healed = Number(healed_count);
    const failed = Number(failed_count || 0);
    const dead = Number(dead_count || 0);

    if (isNaN(healed) || healed < 0) {
      return res.status(400).json({ error: 'Healed count must be a non-negative number.' });
    }

    if (healed > totalAttempted) {
      return res.status(400).json({ error: `Healed count (${healed}) cannot exceed total grafts attempted (${totalAttempted}).` });
    }

    const rate = totalAttempted > 0 ? parseFloat(((healed / totalAttempted) * 100).toFixed(1)) : 0;
    const obsDate = observation_date || new Date().toISOString().split('T')[0];

    await db.transaction(async (trx) => {
      // 1. Insert dated observation without overwriting history
      await trx('curing_survival_observations').insert({
        batch_id: batchId,
        observation_date: obsDate,
        total_grafts_attempted: totalAttempted,
        healed_count: healed,
        failed_count: failed,
        dead_count: dead,
        surviving_count: healed,
        survival_rate: rate,
        notes: notes || null,
        recorded_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      // 2. Update current surviving quantity on batch
      const prevQty = batch.current_quantity;
      const difference = healed - prevQty;

      await trx('batches').where({ id: batchId }).update({
        current_quantity: healed,
        updated_at: db.fn.now(),
      });

      // 3. Record ledger movement if quantity adjusted
      if (difference !== 0) {
        await trx('inventory_movements').insert({
          batch_id: batchId,
          movement_type: difference < 0 ? 'MORTALITY' : 'ADJUSTMENT',
          quantity_change: difference,
          resulting_balance: healed,
          reference_type: 'CURING_OBSERVATION',
          notes: `Curing update: ${healed} surviving healed grafts (${rate}% survival rate)`,
          created_by_user_id: req.user!.id,
          created_at: db.fn.now(),
        });
      }
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'CURING_OBSERVATION_RECORDED',
      entityType: 'CURING',
      entityId: String(batchId),
      newValues: { healed, failed, dead, rate, obsDate },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Curing progress updated: ${healed} surviving healed plants (${rate}% survival rate).`,
      observation: {
        batch_id: batchId,
        observation_date: obsDate,
        total_grafts_attempted: totalAttempted,
        healed_count: healed,
        failed_count: failed,
        dead_count: dead,
        surviving_count: healed,
        survival_rate: rate,
        notes: notes || null,
      },
      surviving_quantity: healed,
      survival_rate: rate,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/curing/:batchId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const history = await db('curing_survival_observations')
      .where({ batch_id: batchId })
      .orderBy('observation_date', 'asc');

    return res.json({ history });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. PHASE F: READY FOR SALE (Explicit Promotion)
// ==========================================
router.get('/ready-for-sale', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const readyBatches = await db('batches')
      .where({ batch_type: 'READY_FOR_SALE' })
      .whereNot('status', 'DISCARDED')
      .orderBy('created_at', 'desc');

    const promotableGrafts = await db('batches')
      .where({ batch_type: 'GRAFTED' })
      .where('current_quantity', '>', 0)
      .whereNot('status', 'DISCARDED')
      .orderBy('created_at', 'desc');

    const resultReady = await Promise.all(
      readyBatches.map(async (rb) => {
        const lineage = await db('batch_lineage').where({ batch_id: rb.id }).first();
        const promo = await db('ready_for_sale_promotions').where({ ready_batch_id: rb.id }).first();

        let rootstockSerial = 'N/A';
        let scionSerial = 'N/A';
        let graftedSerial = 'N/A';

        if (lineage) {
          const graftBatch = await db('batches').where({ id: lineage.parent_batch_id }).first();
          if (graftBatch) {
            graftedSerial = graftBatch.serial_number;
            const parents = await db('batch_lineage').where({ batch_id: graftBatch.id });
            for (const p of parents) {
              const parentB = await db('batches').where({ id: p.parent_batch_id }).first();
              if (p.relationship_type === 'ROOTSTOCK_PARENT') rootstockSerial = parentB?.serial_number || 'N/A';
              if (p.relationship_type === 'SCION_PARENT') scionSerial = parentB?.serial_number || 'N/A';
            }
          }
        }

        return {
          ...rb,
          grafted_serial: graftedSerial,
          original_rootstock: rootstockSerial,
          original_scion: scionSerial,
          ready_date: promo?.promotion_date || rb.created_at,
        };
      })
    );

    return res.json({
      readyBatches: resultReady,
      promotableGrafts,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/ready-for-sale/promote', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { grafted_batch_id, quantity, promotion_date, notes } = req.body;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity to promote must be a positive number.' });
    }

    if (!grafted_batch_id) {
      return res.status(400).json({ error: 'Grafted batch must be selected.' });
    }

    let createdReadyBatch: any = null;

    await db.transaction(async (trx) => {
      // 1. Lock and validate grafted batch
      const graft = await trx('batches').where({ id: grafted_batch_id }).forUpdate().first();
      if (!graft) {
        throw new Error('Grafted batch not found.');
      }
      if (graft.current_quantity < qty) {
        throw new Error(`Insufficient surviving quantity. Available: ${graft.current_quantity}, requested: ${qty}.`);
      }

      // 2. Deduct promoted quantity from grafted batch
      const newGraftQty = graft.current_quantity - qty;
      await trx('batches').where({ id: grafted_batch_id }).update({
        current_quantity: newGraftQty,
        status: newGraftQty === 0 ? 'COMPLETED' : graft.status,
        updated_at: db.fn.now(),
      });

      await trx('inventory_movements').insert({
        batch_id: grafted_batch_id,
        movement_type: 'READY_PROMOTION',
        quantity_change: -qty,
        resulting_balance: newGraftQty,
        reference_type: 'PROMOTION',
        notes: `Promoted ${qty} plants to ready-for-sale inventory`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      // 3. Generate Ready for Sale batch
      const promoDate = promotion_date || new Date().toISOString().split('T')[0];
      const year = new Date(promoDate).getFullYear();
      const prefix = await identifierService.getPrefixForType('READY_FOR_SALE');
      const seq = await identifierService.getNextSequence(`RFS_${year}`);
      const template = await identifierService.getSerialTemplate();
      const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      const [rIdObj] = await trx('batches').insert({
        batch_type: 'READY_FOR_SALE',
        serial_number,
        plant_variety: graft.plant_variety,
        status: 'READY',
        stage: 'READY_FOR_SALE',
        initial_quantity: qty,
        current_quantity: qty,
        location: 'Commercial Dispatch Yard',
        notes: notes || `Promoted from cured graft ${graft.serial_number}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      const rId = typeof rIdObj === 'object' ? rIdObj.id : rIdObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: rId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      // 4. Link lineage
      await trx('batch_lineage').insert({
        batch_id: rId,
        parent_batch_id: grafted_batch_id,
        relationship_type: 'PROMOTED_FROM',
        notes: `Promoted from grafted batch ${graft.serial_number}`,
        created_at: db.fn.now(),
      });

      // 5. Record promotion
      await trx('ready_for_sale_promotions').insert({
        grafted_batch_id,
        ready_batch_id: rId,
        quantity_promoted: qty,
        promotion_date: promoDate,
        notes: notes || null,
        promoted_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      // 6. Record inventory movement
      await trx('inventory_movements').insert({
        batch_id: rId,
        movement_type: 'READY_PROMOTION',
        quantity_change: qty,
        resulting_balance: qty,
        reference_type: 'PROMOTION',
        notes: `New ready-for-sale inventory batch ${serial_number}`,
        created_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });

      // 7. Auto-link to matching catalogue product if exists
      const cleanVar = graft.plant_variety.split('(')[0].trim().toLowerCase();
      const product = await trx('products')
        .whereRaw('LOWER(name) LIKE ?', [`%${cleanVar}%`])
        .first();

      if (product) {
        await trx('product_batch_links').insert({
          product_id: product.id,
          batch_id: rId,
          created_at: db.fn.now(),
        });
      }

      createdReadyBatch = {
        id: rId,
        serial_number,
        plant_variety: graft.plant_variety,
        quantity: qty,
      };
    });

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'BATCH_PROMOTED_TO_READY',
      entityType: 'READY_FOR_SALE',
      newValues: { createdReadyBatch, grafted_batch_id, qty },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Promoted ${qty} plants to Ready-for-Sale batch ${createdReadyBatch.serial_number}.`,
      batch: createdReadyBatch,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Insufficient')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ==========================================
// 9. DASHBOARD METRICS API
// ==========================================
router.get('/dashboard-metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rootstockBatches = await db('batches')
      .where(function () {
        this.whereIn('designation', ['ROOTSTOCK', 'BOTH']).orWhere('batch_type', 'ROOTSTOCK');
      })
      .whereNot('status', 'DISCARDED')
      .count('id as count')
      .first();

    const scionBatches = await db('batches')
      .where(function () {
        this.whereIn('designation', ['SCION', 'BOTH']).orWhere('batch_type', 'SCION');
      })
      .whereNot('status', 'DISCARDED')
      .count('id as count')
      .first();

    const seedsSownRes = await db('sowing_records').sum('seeds_sown as total').first();
    const totalSeedsSown = parseInt(String(seedsSownRes?.total || '0'), 10);

    const germinatedPlantsRes = await db('germination_observations').sum('germinated_count as total').first();
    const totalGerminated = parseInt(String(germinatedPlantsRes?.total || '0'), 10);

    const rootstockAvailRes = await db('batches')
      .where(function () {
        this.whereIn('designation', ['ROOTSTOCK', 'BOTH']).orWhere('batch_type', 'ROOTSTOCK');
      })
      .whereNot('status', 'DISCARDED')
      .where('current_quantity', '>', 0)
      .sum('current_quantity as total')
      .first();
    const rootstockAvailable = parseInt(String(rootstockAvailRes?.total || '0'), 10);

    const scionAvailRes = await db('batches')
      .where(function () {
        this.whereIn('designation', ['SCION', 'BOTH']).orWhere('batch_type', 'SCION');
      })
      .whereNot('status', 'DISCARDED')
      .where('current_quantity', '>', 0)
      .sum('current_quantity as total')
      .first();
    const scionAvailable = parseInt(String(scionAvailRes?.total || '0'), 10);

    const totalGraftsRes = await db('grafting_records').sum('quantity_grafted as total').first();
    const totalGraftsAttempted = parseInt(String(totalGraftsRes?.total || '0'), 10);

    const plantsInCuringRes = await db('batches')
      .where({ batch_type: 'GRAFTED', status: 'CURING' })
      .sum('current_quantity as total')
      .first();
    const plantsInCuring = parseInt(String(plantsInCuringRes?.total || '0'), 10);

    const readyForSalePlantsRes = await db('batches')
      .where({ batch_type: 'READY_FOR_SALE', status: 'READY' })
      .sum('current_quantity as total')
      .first();
    const readyForSalePlants = parseInt(String(readyForSalePlantsRes?.total || '0'), 10);

    const totalPlantsSoldRes = await db('order_items').sum('quantity as total').first();
    const totalPlantsSold = parseInt(String(totalPlantsSoldRes?.total || '0'), 10);

    // Curing survival rate calculation
    const curingStats = await db('grafting_records')
      .sum('quantity_grafted as attempted')
      .sum('successful_count as healed')
      .first();
    const attempted = parseInt(String(curingStats?.attempted || '0'), 10);
    const healed = parseInt(String(curingStats?.healed || '0'), 10);
    const curingSurvivalRate = attempted > 0 ? Math.round((healed / attempted) * 100) : 100;

    // Stage counts
    const sownCount = await db('batches').where('stage', 'SOWN').whereNot('status', 'DISCARDED').count('id as c').first();
    const germinatedCount = await db('batches').where('stage', 'GERMINATED').whereNot('status', 'DISCARDED').count('id as c').first();
    const growingCount = await db('batches').where('stage', 'GROWING').whereNot('status', 'DISCARDED').count('id as c').first();
    const graftedCount = await db('batches').where('batch_type', 'GRAFTED').whereNot('status', 'DISCARDED').count('id as c').first();
    const curingCount = await db('batches').where({ batch_type: 'GRAFTED', status: 'CURING' }).count('id as c').first();
    const readyCount = await db('batches').where({ batch_type: 'READY_FOR_SALE' }).whereNot('status', 'DISCARDED').count('id as c').first();
    const soldCount = await db('orders').count('id as c').first();

    return res.json({
      metrics: {
        totalSeedsSown,
        seedsSown: totalSeedsSown,
        totalGerminated,
        germinatedPlants: totalGerminated,
        rootstockAvailable,
        plantsReadyForGrafting: rootstockAvailable,
        scionAvailable,
        totalGraftsAttempted,
        activeGraftingBatches: totalGraftsAttempted,
        plantsInCuring,
        plantsUnderCuring: plantsInCuring,
        curingSurvivalRate,
        readyForSalePlants,
        totalPlantsSold,
        totalRootstockBatches: parseInt(String(rootstockBatches?.count || '0'), 10),
        totalScionBatches: parseInt(String(scionBatches?.count || '0'), 10),
        stageCounts: {
          sown: parseInt(String(sownCount?.c || '0'), 10),
          germinated: parseInt(String(germinatedCount?.c || '0'), 10),
          growing: parseInt(String(growingCount?.c || '0'), 10),
          grafted: parseInt(String(graftedCount?.c || '0'), 10),
          curing: parseInt(String(curingCount?.c || '0'), 10),
          readyForSale: parseInt(String(readyCount?.c || '0'), 10),
          sold: parseInt(String(soldCount?.c || '0'), 10),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 10. INVENTORY MOVEMENTS (Ledger History)
// ==========================================
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

// ==========================================
// 11. LEGACY COMPATIBILITY ENDPOINTS (Supporting test suites)
// ==========================================
router.post('/sow', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plant_variety, seeds_sown, sowing_date, location, notes, seed_lot_id } = req.body;
    const year = new Date().getFullYear();
    const prefix = await identifierService.getPrefixForType('ROOTSTOCK');
    const seq = await identifierService.getNextSequence(`ROOT_${year}`);
    const template = await identifierService.getSerialTemplate();
    const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

    let batchId: any;
    await db.transaction(async (trx) => {
      const [idObj] = await trx('batches').insert({
        batch_type: 'ROOTSTOCK',
        serial_number,
        plant_variety,
        status: 'ACTIVE',
        stage: 'SOWN',
        initial_quantity: seeds_sown,
        current_quantity: seeds_sown,
        location: location || 'Nursery Bed',
        notes: notes || 'Legacy sowing endpoint',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      batchId = typeof idObj === 'object' ? idObj.id : idObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: batchId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      await trx('sowing_records').insert({
        batch_id: batchId,
        seed_lot_id: seed_lot_id || null,
        seeds_sown,
        sowing_date: sowing_date || new Date().toISOString().split('T')[0],
        germination_count: 0,
        live_count: seeds_sown,
        plant_type: 'ROOTSTOCK',
        variety: plant_variety,
        created_at: db.fn.now(),
      });

      await trx('inventory_movements').insert({
        batch_id: batchId,
        movement_type: 'SOWING',
        quantity_change: seeds_sown,
        resulting_balance: seeds_sown,
        reference_type: 'SOWING',
        created_at: db.fn.now(),
      });
    });

    return res.status(201).json({
      batch: { id: batchId, serial_number, plant_variety, current_quantity: seeds_sown },
    });
  } catch (err) {
    next(err);
  }
});

router.post(['/harvest-scion', '/scion-harvest'], requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mother_tree_id, cuttings_harvested, harvest_date, technician_name, notes } = req.body;
    const tree = await db('mother_trees').where({ id: mother_tree_id }).first();
    const year = new Date().getFullYear();
    const prefix = await identifierService.getPrefixForType('SCION');
    const seq = await identifierService.getNextSequence(`SCION_${year}`);
    const template = await identifierService.getSerialTemplate();
    const serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

    let batchId: any;
    await db.transaction(async (trx) => {
      const [idObj] = await trx('batches').insert({
        batch_type: 'SCION',
        serial_number,
        plant_variety: tree ? tree.plant_variety : 'Scion Variety',
        status: 'ACTIVE',
        stage: 'READY_FOR_GRAFTING',
        initial_quantity: cuttings_harvested,
        current_quantity: cuttings_harvested,
        location: 'Mist Storage',
        notes: notes || 'Legacy scion harvest',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      batchId = typeof idObj === 'object' ? idObj.id : idObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: batchId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      await trx('inventory_movements').insert({
        batch_id: batchId,
        movement_type: 'SCION_HARVEST',
        quantity_change: cuttings_harvested,
        resulting_balance: cuttings_harvested,
        reference_type: 'SCION_HARVEST',
        created_at: db.fn.now(),
      });
    });

    return res.status(201).json({
      batch: { id: batchId, batchId, serial_number, current_quantity: cuttings_harvested },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/graft', requirePermission('INVENTORY_WRITE'), handleGrafting);

router.post('/mortality', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batch_id, dead_count, mortality_count, cause_of_death, reason, notes } = req.body;
    const lossQty = Number(dead_count ?? mortality_count);
    const reasonText = cause_of_death || reason || notes || 'Mortality loss';

    const batch = await db('batches').where({ id: batch_id }).first();
    if (!batch) return res.status(404).json({ error: 'Batch not found.' });
    if (lossQty > batch.current_quantity) {
      return res.status(400).json({ error: 'Loss exceeds available quantity.' });
    }

    const newQty = batch.current_quantity - lossQty;
    await db.transaction(async (trx) => {
      await trx('batches').where({ id: batch_id }).update({ current_quantity: newQty });
      await trx('inventory_movements').insert({
        batch_id,
        movement_type: 'MORTALITY',
        quantity_change: -lossQty,
        resulting_balance: newQty,
        reference_type: 'MORTALITY',
        notes: reasonText,
        created_at: db.fn.now(),
      });
    });

    return res.status(200).json({ success: true, batch: { ...batch, current_quantity: newQty } });
  } catch (err) {
    next(err);
  }
});

router.post('/promote-ready', requirePermission('INVENTORY_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { grafted_batch_id, quantity, notes } = req.body;
    const qty = Number(quantity);
    const graft = await db('batches').where({ id: grafted_batch_id }).first();
    if (!graft) return res.status(404).json({ error: 'Graft batch not found.' });

    let rId: any;
    let serial_number = '';
    const year = new Date().getFullYear();
    const prefix = await identifierService.getPrefixForType('READY_FOR_SALE');
    const seq = await identifierService.getNextSequence(`RFS_${year}`);
    const template = await identifierService.getSerialTemplate();
    serial_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

    await db.transaction(async (trx) => {
      await trx('batches').where({ id: grafted_batch_id }).update({
        current_quantity: graft.current_quantity - qty,
      });

      const [idObj] = await trx('batches').insert({
        batch_type: 'READY_FOR_SALE',
        serial_number,
        plant_variety: graft.plant_variety,
        status: 'READY',
        stage: 'READY_FOR_SALE',
        initial_quantity: qty,
        current_quantity: qty,
        location: 'Sales Yard',
        notes: notes || 'Promoted to sale',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');

      rId = typeof idObj === 'object' ? idObj.id : idObj;

      await trx('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: rId,
        scheme: 'SERIAL',
        value: serial_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      await trx('batch_lineage').insert({
        batch_id: rId,
        parent_batch_id: grafted_batch_id,
        relationship_type: 'PROMOTED_FROM',
        created_at: db.fn.now(),
      });

      await trx('ready_for_sale_promotions').insert({
        grafted_batch_id,
        ready_batch_id: rId,
        quantity_promoted: qty,
        promotion_date: new Date().toISOString().split('T')[0],
        notes: notes || 'Promoted to Ready for Sale',
        promoted_by_user_id: req.user!.id,
        created_at: db.fn.now(),
      });
    });

    return res.status(201).json({
      batch: { id: rId, rfsId: rId, batchId: rId, serial_number, current_quantity: qty },
      readyBatch: { id: rId, serial_number, current_quantity: qty },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
