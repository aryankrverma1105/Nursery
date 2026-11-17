import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// 1. ROLE-BASED DASHBOARD STATS
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Total Live Plants across all batches
    const liveCounts = await db('batches')
      .groupBy('batch_type')
      .select('batch_type')
      .sum('current_quantity as total_quantity')
      .count('id as batch_count');

    // Quarantined batches
    const quarantinedBatches = await db('batches')
      .where('status', 'QUARANTINED')
      .select('id', 'serial_number', 'plant_variety', 'current_quantity', 'quarantine_reason', 'quarantined_at');

    // Low Stock Alerts (Ready-for-Sale batches with current_quantity < 25)
    const lowStockAlerts = await db('batches')
      .where('batch_type', 'READY_FOR_SALE')
      .andWhere('status', 'READY')
      .andWhere('current_quantity', '<', 25)
      .select('id', 'serial_number', 'plant_variety', 'current_quantity');

    // High Mortality Batches
    const highMortalityBatches = await db('curing_mortality_records')
      .join('batches', 'curing_mortality_records.batch_id', 'batches.id')
      .where('curing_mortality_records.mortality_count', '>', 15)
      .select('batches.serial_number', 'batches.plant_variety', 'curing_mortality_records.*')
      .limit(5);

    // Sales metrics (Admin & Supervisor)
    let salesMetrics = { totalRevenue: 0, totalOrders: 0 };
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      const orderSummary: any = await db('orders').sum('total_amount as revenue').count('id as order_count').first();
      salesMetrics = {
        totalRevenue: parseFloat(orderSummary?.revenue || '0'),
        totalOrders: parseInt(orderSummary?.order_count || '0', 10),
      };
    }

    return res.json({
      role: user.role,
      liveCounts,
      quarantinedBatches,
      lowStockAlerts,
      highMortalityBatches,
      salesMetrics,
    });
  } catch (err) {
    next(err);
  }
});

// 2. CSV EXPORT
router.get('/export', requireRole(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'inventory' } = req.query;

    if (type === 'sales') {
      const orders = await db('orders')
        .join('customers', 'orders.customer_id', 'customers.id')
        .select('orders.invoice_number', 'orders.order_date', 'customers.name as customer', 'orders.total_amount', 'orders.payment_mode', 'orders.payment_status')
        .orderBy('orders.order_date', 'desc');

      let csv = 'Invoice Number,Date,Customer,Total Amount,Payment Mode,Payment Status\n';
      orders.forEach((o) => {
        csv += `"${o.invoice_number}","${o.order_date}","${o.customer}",${o.total_amount},"${o.payment_mode}","${o.payment_status}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
      return res.send(csv);
    } else {
      const batches = await db('batches').orderBy('created_at', 'desc');
      let csv = 'Serial Number,Batch Type,Variety,Status,Current Quantity,Location,Created At\n';
      batches.forEach((b) => {
        csv += `"${b.serial_number}","${b.batch_type}","${b.plant_variety}","${b.status}",${b.current_quantity},"${b.location || ''}","${b.created_at}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
      return res.send(csv);
    }
  } catch (err) {
    next(err);
  }
});

// 3. AUDIT LOGS VIEWER (Admin only)
router.get('/audit-logs', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '100', action, entityType } = req.query;

    let query = db('audit_logs')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .select('audit_logs.*', 'users.full_name as author_name', 'users.email as author_email')
      .orderBy('audit_logs.created_at', 'desc')
      .limit(Math.min(200, parseInt(limit as string, 10) || 100));

    if (action) {
      query = query.where('audit_logs.action', action as string);
    }
    if (entityType) {
      query = query.where('audit_logs.entity_type', entityType as string);
    }

    const logs = await query;
    return res.json({ logs });
  } catch (err) {
    next(err);
  }
});

export default router;

