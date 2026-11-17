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

// Helper to assemble full workflow lineage backtracking for any batch
async function assembleWorkflowTimeline(targetBatchId: number) {
  const batch = await db('batches').where({ id: targetBatchId }).first();
  if (!batch) return null;

  let rfsBatch: any = null;
  let graftBatch: any = null;
  let rootstockBatch: any = null;
  let scionBatch: any = null;

  if (batch.batch_type === 'READY_FOR_SALE') {
    rfsBatch = batch;
    const parentLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.parent_batch_id', 'batches.id')
      .where('batch_lineage.batch_id', batch.id)
      .select('batches.*', 'batch_lineage.relationship_type');

    for (const p of parentLinks) {
      if (p.batch_type === 'GRAFTED') {
        graftBatch = p;
        break;
      }
    }
  } else if (batch.batch_type === 'GRAFTED') {
    graftBatch = batch;
    // Check if there is a child RFS batch
    const childLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.batch_id', 'batches.id')
      .where('batch_lineage.parent_batch_id', batch.id)
      .select('batches.*');
    for (const c of childLinks) {
      if (c.batch_type === 'READY_FOR_SALE') {
        rfsBatch = c;
        break;
      }
    }
  } else if (batch.batch_type === 'ROOTSTOCK' || batch.designation === 'ROOTSTOCK') {
    rootstockBatch = batch;
    // Check for child graft
    const childLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.batch_id', 'batches.id')
      .where('batch_lineage.parent_batch_id', batch.id)
      .select('batches.*');
    for (const c of childLinks) {
      if (c.batch_type === 'GRAFTED') {
        graftBatch = c;
        break;
      }
    }
  } else if (batch.batch_type === 'SCION' || batch.designation === 'SCION') {
    scionBatch = batch;
    // Check for child graft
    const childLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.batch_id', 'batches.id')
      .where('batch_lineage.parent_batch_id', batch.id)
      .select('batches.*');
    for (const c of childLinks) {
      if (c.batch_type === 'GRAFTED') {
        graftBatch = c;
        break;
      }
    }
  } else if (batch.designation === 'BOTH' || batch.batch_type === 'BOTH') {
    // Sowing batch designated for both
    const childLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.batch_id', 'batches.id')
      .where('batch_lineage.parent_batch_id', batch.id)
      .select('batches.*');
    for (const c of childLinks) {
      if (c.batch_type === 'GRAFTED') {
        graftBatch = c;
        break;
      }
    }
  }

  // If we have a graft batch, find rootstock & scion parents if not already known
  if (graftBatch) {
    const parents = await db('batch_lineage')
      .join('batches', 'batch_lineage.parent_batch_id', 'batches.id')
      .where('batch_lineage.batch_id', graftBatch.id)
      .select('batches.*', 'batch_lineage.relationship_type');

    for (const p of parents) {
      if (
        p.relationship_type === 'ROOTSTOCK_PARENT' ||
        p.relationship_type === 'ROOTSTOCK' ||
        p.batch_type === 'ROOTSTOCK' ||
        p.designation === 'ROOTSTOCK'
      ) {
        rootstockBatch = p;
      }
      if (
        p.relationship_type === 'SCION_PARENT' ||
        p.relationship_type === 'SCION' ||
        p.batch_type === 'SCION' ||
        p.designation === 'SCION'
      ) {
        scionBatch = p;
      }
      if (p.relationship_type === 'DUAL_PARENT') {
        rootstockBatch = p;
        scionBatch = p;
      }
    }
  }

  // Gather Sowing & Germination for Rootstock
  let rootstockOrigin: any = null;
  if (rootstockBatch) {
    const sowing = await db('sowing_records')
      .leftJoin('seed_lots', 'sowing_records.seed_lot_id', 'seed_lots.id')
      .leftJoin('suppliers', 'seed_lots.supplier_id', 'suppliers.id')
      .where('sowing_records.batch_id', rootstockBatch.id)
      .select(
        'sowing_records.*',
        'seed_lots.lot_code',
        'seed_lots.plant_variety as seed_variety',
        'suppliers.name as seed_supplier_name'
      )
      .first();

    const germObs = await db('germination_observations')
      .where({ batch_id: rootstockBatch.id })
      .orderBy('observation_date', 'asc');

    const growthLogs = await db('plant_growth_logs')
      .where({ batch_id: rootstockBatch.id })
      .orderBy('log_date', 'asc');

    const totalSown = sowing ? (sowing.number_of_seeds_sown || sowing.seed_count || rootstockBatch.initial_quantity) : rootstockBatch.initial_quantity;
    const latestGerm = germObs.length > 0 ? germObs[germObs.length - 1] : null;
    const germinatedQty = latestGerm ? latestGerm.germinated_seeds : (rootstockBatch.current_quantity || 0);
    const germRate = totalSown > 0 ? Math.min(100, Math.round((germinatedQty / totalSown) * 100)) : 100;

    rootstockOrigin = {
      batch: rootstockBatch,
      sowing: sowing ? {
        sowing_date: sowing.sowing_date,
        variety: sowing.variety || rootstockBatch.plant_variety,
        plant_type: sowing.plant_type || 'Rootstock',
        seed_source: sowing.seed_source || sowing.seed_supplier_name || 'In-House Mother Stock',
        seeds_sown: totalSown,
        location: sowing.location || rootstockBatch.location_nursery_bed,
        notes: sowing.notes,
      } : {
        sowing_date: rootstockBatch.created_at,
        variety: rootstockBatch.plant_variety,
        plant_type: 'Rootstock',
        seed_source: 'In-House Mother Stock',
        seeds_sown: totalSown,
        location: rootstockBatch.location_nursery_bed,
        notes: null,
      },
      germinationObservations: germObs,
      growthLogs,
      germinationRate: germRate,
      remainingViable: rootstockBatch.current_quantity,
    };
  }

  // Gather Sowing & Germination for Scion
  let scionOrigin: any = null;
  if (scionBatch) {
    const sowing = await db('sowing_records')
      .leftJoin('seed_lots', 'sowing_records.seed_lot_id', 'seed_lots.id')
      .leftJoin('suppliers', 'seed_lots.supplier_id', 'suppliers.id')
      .where('sowing_records.batch_id', scionBatch.id)
      .select(
        'sowing_records.*',
        'seed_lots.lot_code',
        'seed_lots.plant_variety as seed_variety',
        'suppliers.name as seed_supplier_name'
      )
      .first();

    const germObs = await db('germination_observations')
      .where({ batch_id: scionBatch.id })
      .orderBy('observation_date', 'asc');

    const growthLogs = await db('plant_growth_logs')
      .where({ batch_id: scionBatch.id })
      .orderBy('log_date', 'asc');

    const totalSown = sowing ? (sowing.number_of_seeds_sown || sowing.seed_count || scionBatch.initial_quantity) : scionBatch.initial_quantity;
    const latestGerm = germObs.length > 0 ? germObs[germObs.length - 1] : null;
    const germinatedQty = latestGerm ? latestGerm.germinated_seeds : (scionBatch.current_quantity || 0);
    const germRate = totalSown > 0 ? Math.min(100, Math.round((germinatedQty / totalSown) * 100)) : 100;

    scionOrigin = {
      batch: scionBatch,
      sowing: sowing ? {
        sowing_date: sowing.sowing_date,
        variety: sowing.variety || scionBatch.plant_variety,
        plant_type: sowing.plant_type || 'Scion',
        seed_source: sowing.seed_source || sowing.seed_supplier_name || 'Verified Mother Stock',
        seeds_sown: totalSown,
        location: sowing.location || scionBatch.location_nursery_bed,
        notes: sowing.notes,
      } : {
        sowing_date: scionBatch.created_at,
        variety: scionBatch.plant_variety,
        plant_type: 'Scion',
        seed_source: 'Verified Mother Stock',
        seeds_sown: totalSown,
        location: scionBatch.location_nursery_bed,
        notes: null,
      },
      germinationObservations: germObs,
      growthLogs,
      germinationRate: germRate,
      remainingViable: scionBatch.current_quantity,
    };
  }

  // Grafting & Curing Details
  let graftingDetails: any = null;
  let curingObservations: any[] = [];
  if (graftBatch) {
    const graftRec = await db('grafting_records')
      .where('batch_id', graftBatch.id)
      .first();

    curingObservations = await db('curing_survival_observations')
      .where({ batch_id: graftBatch.id })
      .orderBy('observation_date', 'asc');

    // Also include legacy curing logs if table exists
    const legacyCuring = await db('curing_mortality_records')
      .where({ batch_id: graftBatch.id })
      .orderBy('recorded_at', 'asc');

    graftingDetails = {
      batch: graftBatch,
      grafting_record: graftRec || null,
      grafting_date: graftRec?.grafting_date || graftBatch.created_at,
      technician: graftRec?.technician_name || 'Lead Horticulturist',
      grafting_method: graftRec?.grafting_method || 'Wedge / Cleft Graft',
      attempts_count: graftRec?.attempted_count || graftBatch.initial_quantity,
      success_count: graftRec?.success_count || graftBatch.current_quantity,
    };
  }

  // Ready for Sale Details
  let rfsDetails: any = null;
  if (rfsBatch) {
    const promo = await db('ready_for_sale_promotions')
      .where({ ready_batch_id: rfsBatch.id })
      .first();

    rfsDetails = {
      batch: rfsBatch,
      promotion: promo || null,
      ready_date: promo?.promotion_date || promo?.created_at || rfsBatch.created_at,
      quantity_ready: rfsBatch.initial_quantity,
      quantity_available: rfsBatch.current_quantity,
      status: rfsBatch.status,
    };
  }

  // Sales records for RFS batch or graft batch
  const batchIdsToFindSales = [batch.id];
  if (rfsBatch) batchIdsToFindSales.push(rfsBatch.id);
  if (graftBatch) batchIdsToFindSales.push(graftBatch.id);

  const salesItems = await db('order_items')
    .join('orders', 'order_items.order_id', 'orders.id')
    .leftJoin('customers', 'orders.customer_id', 'customers.id')
    .whereIn('order_items.batch_id', Array.from(new Set(batchIdsToFindSales)))
    .select(
      'orders.id as order_id',
      'orders.invoice_number',
      'orders.order_date',
      'orders.total_amount',
      'orders.discount',
      'orders.payment_mode',
      'orders.payment_status',
      'orders.customer_name as inline_cust_name',
      'orders.customer_phone as inline_cust_phone',
      'customers.name as cust_name',
      'customers.phone as cust_phone',
      'order_items.quantity as sold_quantity',
      'order_items.unit_price',
      'order_items.total_price'
    )
    .orderBy('orders.order_date', 'desc');

  const formattedSales = salesItems.map((s) => ({
    order_id: s.order_id,
    invoice_number: s.invoice_number,
    order_date: s.order_date,
    customer_name: s.inline_cust_name || s.cust_name || 'Direct Walk-in Buyer',
    customer_phone: s.inline_cust_phone || s.cust_phone || 'N/A',
    sold_quantity: s.sold_quantity,
    unit_price: s.unit_price,
    total_price: s.total_price,
    discount: s.discount || 0,
    payment_mode: s.payment_mode,
    payment_status: s.payment_status,
  }));

  return {
    searchedBatch: batch,
    salesRecords: formattedSales,
    readyForSale: rfsDetails,
    grafting: graftingDetails,
    curingObservations,
    rootstockOrigin,
    scionOrigin,
  };
}

// 1. TRACEABILITY PEDIGREE GRAPH & WORKFLOW TIMELINE
router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const cleanCode = code.trim().toUpperCase();

    // 1. Try identifier lookup first
    let identifier = await identifierService.lookup(cleanCode);

    // If not found in identifiers table, check directly in batches by serial_number
    let batchId: number | null = null;
    let orderId: number | null = null;

    if (identifier) {
      if (identifier.entity_type === 'BATCH') {
        batchId = identifier.entity_id;
      } else if (identifier.entity_type === 'ORDER') {
        orderId = identifier.entity_id;
      }
    } else {
      // Direct batch serial match
      const directBatch = await db('batches').where({ serial_number: cleanCode }).first();
      if (directBatch) {
        batchId = directBatch.id;
        identifier = {
          id: directBatch.id,
          entity_type: 'BATCH',
          entity_id: directBatch.id,
          scheme: 'SERIAL',
          value: directBatch.serial_number,
          status: 'ACTIVE',
          issued_at: directBatch.created_at,
        } as any;
      } else {
        // Direct order invoice match
        const directOrder = await db('orders').where({ invoice_number: cleanCode }).first();
        if (directOrder) {
          orderId = directOrder.id;
          identifier = {
            id: directOrder.id,
            entity_type: 'ORDER',
            entity_id: directOrder.id,
            scheme: 'SERIAL',
            value: directOrder.invoice_number,
            status: 'ACTIVE',
            issued_at: directOrder.created_at,
          } as any;
        }
      }
    }

    if (!identifier && !batchId && !orderId) {
      return res.status(404).json({ error: `Identifier or code "${cleanCode}" not found in farm registry.` });
    }

    // If it's an Order / Invoice code:
    if (orderId) {
      const order = await db('orders').where({ id: orderId }).first();
      const orderItems = await db('order_items').where({ order_id: orderId });
      const firstBatchId = orderItems.length > 0 ? orderItems[0].batch_id : null;

      let workflowTimeline: any = null;
      if (firstBatchId) {
        workflowTimeline = await assembleWorkflowTimeline(firstBatchId);
      }

      return res.json({
        type: 'ORDER',
        identifier,
        order,
        orderItems,
        workflowTimeline,
      });
    }

    // It's a batch
    if (!batchId) {
      return res.status(404).json({ error: 'Batch record not found.' });
    }

    const batch = await db('batches').where({ id: batchId }).first();
    if (!batch) {
      return res.status(404).json({ error: 'Batch record missing.' });
    }

    // Parents Lineage (Ascendants)
    const parentLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.parent_batch_id', 'batches.id')
      .where('batch_lineage.batch_id', batch.id)
      .select('batch_lineage.relationship_type', 'batches.*');

    // Children Lineage (Descendants)
    const childLinks = await db('batch_lineage')
      .join('batches', 'batch_lineage.batch_id', 'batches.id')
      .where('batch_lineage.parent_batch_id', batch.id)
      .select('batch_lineage.relationship_type', 'batches.*');

    // Legacy direct records for compatibility
    const graftingRecord = await db('grafting_records')
      .leftJoin('mother_trees', 'grafting_records.mother_tree_id', 'mother_trees.id')
      .where('grafting_records.batch_id', batch.id)
      .select('grafting_records.*', 'mother_trees.tree_code as donor_tree_code')
      .first();

    const sowingRecord = await db('sowing_records')
      .where('sowing_records.batch_id', batch.id)
      .first();

    const scionRecord = await db('scion_harvest_records')
      .where('scion_harvest_records.batch_id', batch.id)
      .first();

    // Assemble the complete Phase H 7-stage backtracking timeline
    const workflowTimeline = await assembleWorkflowTimeline(batch.id);

    // All Identifiers associated with this batch
    const allIdentifiers = await db('identifiers')
      .where({ entity_type: 'BATCH', entity_id: batch.id })
      .orderBy('issued_at', 'asc');

    return res.json({
      identifier,
      batch,
      parents: parentLinks,
      children: childLinks,
      graftingRecord: graftingRecord || null,
      sowingRecord: sowingRecord || null,
      scionRecord: scionRecord || null,
      workflowTimeline,
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
