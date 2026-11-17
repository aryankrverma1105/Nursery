import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import identifierService from '../services/identifier/IdentifierService.js';
import { AuditService } from '../services/audit/AuditService.js';
import { invalidatePublicCache } from './public.routes.js';

const router = Router();
router.use(requireAuth);

// Recursive helper to get all descendants of a batch
async function getAllDescendantBatchIds(batchId: number): Promise<number[]> {
  const directChildren = await db('batch_lineage')
    .where({ parent_batch_id: batchId })
    .select('batch_id');

  const childIds = directChildren.map((c) => c.batch_id);
  const allIds = [...childIds];

  for (const cid of childIds) {
    const subDescendants = await getAllDescendantBatchIds(cid);
    allIds.push(...subDescendants);
  }

  return Array.from(new Set(allIds));
}

// 1. TRACEABILITY PEDIGREE GRAPH
router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const cleanCode = code.trim().toUpperCase();

    // 1. Pluggable lookup
    const identifier = await identifierService.lookup(cleanCode);
    if (!identifier) {
      return res.status(404).json({ error: `Identifier "${cleanCode}" not found in registry.` });
    }

    if (identifier.entity_type !== 'BATCH') {
      // If code is SEED_LOT or ORDER, return entity info
      return res.json({
        type: identifier.entity_type,
        identifier,
        message: `Code maps to ${identifier.entity_type} #${identifier.entity_id}`,
      });
    }

    const batch = await db('batches').where({ id: identifier.entity_id }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch record missing.' });
    }

    // 2. Parents Lineage (Ascendants)
    const parentLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.parent_batch_id', 'batches.id')
      .where('batch_lineage.batch_id', batch.id)
      .select('batch_lineage.relationship_type', 'batches.*');

    // 3. Children Lineage (Descendants)
    const childLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.batch_id', 'batches.id')
      .where('batch_lineage.parent_batch_id', batch.id)
      .select('batch_lineage.relationship_type', 'batches.*');

    // 4. Sowing Record (if rootstock or derived)
    const sowingRecord = await db('sowing_records')
      .leftJoin('seed_lots', 'sowing_records.seed_lot_id', 'seed_lots.id')
      .leftJoin('suppliers', 'seed_lots.supplier_id', 'suppliers.id')
      .where('sowing_records.batch_id', batch.id)
      .select('sowing_records.*', 'seed_lots.lot_code', 'seed_lots.plant_variety as seed_variety', 'suppliers.name as supplier_name')
      .first();

    // 5. Scion Harvest Record (if scion or donor tree)
    const scionRecord = await db('scion_harvest_records')
      .leftJoin('mother_trees', 'scion_harvest_records.mother_tree_id', 'mother_trees.id')
      .where('scion_harvest_records.batch_id', batch.id)
      .select('scion_harvest_records.*', 'mother_trees.tree_code', 'mother_trees.location_block', 'mother_trees.age_years')
      .first();

    // 6. Grafting Record (if grafted)
    const graftingRecord = await db('grafting_records')
      .leftJoin('mother_trees', 'grafting_records.mother_tree_id', 'mother_trees.id')
      .where('grafting_records.batch_id', batch.id)
      .select('grafting_records.*', 'mother_trees.tree_code as donor_tree_code')
      .first();

    // 7. Curing & Mortality Logs
    const curingLogs = await db('curing_mortality_records')
      .where({ batch_id: batch.id })
      .orderBy('recorded_at', 'desc');

    // 8. Sales History (if any sold from this batch)
    const salesItems = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .join('customers', 'orders.customer_id', 'customers.id')
      .where('order_items.batch_id', batch.id)
      .select('orders.invoice_number', 'orders.order_date', 'customers.name as customer_name', 'order_items.quantity', 'order_items.unit_price');

    // 9. All Identifiers associated with this batch
    const allIdentifiers = await db('identifiers')
      .where({ entity_type: 'BATCH', entity_id: batch.id })
      .orderBy('issued_at', 'asc');

    return res.json({
      identifier,
      batch,
      parents: parentLinks,
      children: childLinks,
      sowingRecord: sowingRecord || null,
      scionRecord: scionRecord || null,
      graftingRecord: graftingRecord || null,
      curingLogs,
      salesItems,
      allIdentifiers,
    });
  } catch (err) {
    next(err);
  }
});

// 2. QUARANTINE ACTION
router.post('/quarantine', requirePermission('QUARANTINE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batch_id, reason } = req.body;
    if (!batch_id || !reason) {
      return res.status(400).json({ error: 'Batch ID and quarantine reason are required.' });
    }

    const batch = await db('batches').where({ id: batch_id }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    // Get all downstream descendants
    const descendantIds = await getAllDescendantBatchIds(batch.id);
    const allAffectedIds = [batch.id, ...descendantIds];

    await db.transaction(async (trx) => {
      for (const id of allAffectedIds) {
        await trx('batches').where({ id }).update({
          status: 'QUARANTINED',
          quarantined_at: db.fn.now(),
          quarantine_reason: `Quarantine initiated from batch ${batch.serial_number}: ${reason}`,
          updated_at: db.fn.now(),
        });

        // Write ledger quarantine hold
        const current = await trx('batches').where({ id }).first();
        await trx('inventory_movements').insert({
          batch_id: id,
          movement_type: 'QUARANTINE_HOLD',
          quantity_change: 0,
          resulting_balance: current.current_quantity,
          reference_type: 'QUARANTINE',
          notes: `Quarantine applied. Reason: ${reason}`,
          created_by_user_id: req.user!.id,
          created_at: db.fn.now(),
        });
      }
    });

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'BATCH_QUARANTINE',
      entityType: 'BATCH',
      entityId: batch.id,
      newValues: { affectedBatchIds: allAffectedIds, reason },
      ipAddress: req.ip,
    });

    return res.json({
      message: `Batch ${batch.serial_number} and ${descendantIds.length} descendant batches have been quarantined and removed from sale availability.`,
      quarantinedBatchCount: allAffectedIds.length,
    });
  } catch (err) {
    next(err);
  }
});

// 3. RELEASE QUARANTINE ACTION
router.post('/release', requirePermission('QUARANTINE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batch_id, reason } = req.body;
    if (!batch_id || !reason) {
      return res.status(400).json({ error: 'Batch ID and release justification are required.' });
    }

    const batch = await db('batches').where({ id: batch_id }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found.' });
    }

    const restoredStatus = batch.batch_type === 'READY_FOR_SALE' ? 'READY' : (batch.batch_type === 'GRAFTED' ? 'CURING' : 'ACTIVE');

    await db('batches').where({ id: batch.id }).update({
      status: restoredStatus,
      quarantined_at: null,
      quarantine_reason: null,
      updated_at: db.fn.now(),
    });

    await db('inventory_movements').insert({
      batch_id: batch.id,
      movement_type: 'QUARANTINE_RELEASE',
      quantity_change: 0,
      resulting_balance: batch.current_quantity,
      reference_type: 'QUARANTINE_RELEASE',
      notes: `Released from quarantine. Reason: ${reason}`,
      created_by_user_id: req.user!.id,
      created_at: db.fn.now(),
    });

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'RELEASE_QUARANTINE',
      entityType: 'BATCH',
      entityId: batch.id,
      newValues: { restoredStatus, reason },
      ipAddress: req.ip,
    });

    return res.json({
      message: `Batch ${batch.serial_number} released from quarantine with status ${restoredStatus}.`,
    });
  } catch (err) {
    next(err);
  }
});

// 4. PRINTABLE LABEL TAG
router.get('/label/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const identifier = await identifierService.lookup(code);
    if (!identifier) {
      return res.status(404).json({ error: 'Identifier not found.' });
    }

    let variety = 'Horticulture Batch';
    let batchType = identifier.entity_type;
    let quantity = 0;

    if (identifier.entity_type === 'BATCH') {
      const b = await db('batches').where({ id: identifier.entity_id }).first();
      if (b) {
        variety = b.plant_variety;
        batchType = b.batch_type;
        quantity = b.current_quantity;
      }
    }

    const label = await identifierService.renderLabel(identifier.value, {
      variety,
      batchType,
      quantity,
    });

    return res.json({ label });
  } catch (err) {
    next(err);
  }
});

export default router;

