import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import identifierService from '../services/identifier/IdentifierService.js';
import { AuditService } from '../services/audit/AuditService.js';

const router = Router();
router.use(requireAuth);

// 1. CUSTOMERS
router.get('/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await db('customers').orderBy('name', 'asc');
    return res.json({ customers });
  } catch (err) {
    next(err);
  }
});

router.post('/customers', requirePermission('SALES_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, address, company_name, gst_or_tax_id } = req.body;
    const [inserted] = await db('customers').insert({
      name,
      phone,
      email,
      address,
      company_name,
      gst_or_tax_id,
      created_at: db.fn.now(),
    }).returning('*');
    return res.status(201).json({ customer: inserted });
  } catch (err) {
    next(err);
  }
});

// 2. ORDERS & SALES RECORDING (Atomic Ledger Batch Deductions)
const OrderSchema = z.object({
  customer_id: z.number(),
  order_date: z.string(),
  items: z.array(
    z.object({
      batch_id: z.number(),
      product_id: z.number().optional().nullable(),
      quantity: z.number().positive(),
      unit_price: z.number().positive(),
    })
  ).min(1, 'Order must contain at least one plant batch item'),
  payment_mode: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CREDIT']),
  payment_status: z.enum(['PENDING', 'PAID', 'PARTIAL']).default('PAID'),
  payment_notes: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/orders', requirePermission('SALES_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = OrderSchema.parse(req.body);

    const result = await db.transaction(async (trx) => {
      // 1. Generate Invoice Number
      const year = new Date().getFullYear();
      const prefix = await identifierService.getPrefixForType('ORDER');
      const seq = await identifierService.getNextSequence(`SALE_${year}`);
      const template = await identifierService.getSerialTemplate();
      const invoice_number = identifierService.getStrategy('SERIAL').format(prefix, year, seq, template);

      // Compute total
      const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

      // 2. Insert Order
      const [orderIdObj] = await trx('orders').insert({
        invoice_number,
        customer_id: data.customer_id,
        order_date: data.order_date,
        total_amount: totalAmount,
        payment_mode: data.payment_mode,
        payment_status: data.payment_status,
        payment_notes: data.payment_notes,
        status: 'CONFIRMED',
        created_by_user_id: req.user!.id,
        notes: data.notes,
        created_at: db.fn.now(),
      }).returning('id');

      const orderId = typeof orderIdObj === 'object' ? orderIdObj.id : orderIdObj;

      // 3. Register Identifier
      await trx('identifiers').insert({
        entity_type: 'ORDER',
        entity_id: orderId,
        scheme: 'SERIAL',
        value: invoice_number,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      });

      // 4. Process each item: Row lock batch, verify stock, deduct from batch, write ledger movement
      for (const item of data.items) {
        const batch = await trx('batches').where({ id: item.batch_id }).forUpdate().first();
        if (!batch) {
          throw new Error(`Batch ID #${item.batch_id} not found.`);
        }
        if (batch.status === 'QUARANTINED') {
          throw new Error(`Cannot sell from batch ${batch.serial_number}: Batch is currently QUARANTINED.`);
        }
        if (batch.current_quantity < item.quantity) {
          throw new Error(
            `Insufficient stock in batch ${batch.serial_number}! Available: ${batch.current_quantity}, Requested: ${item.quantity}`
          );
        }

        const newBalance = batch.current_quantity - item.quantity;
        await trx('batches').where({ id: batch.id }).update({
          current_quantity: newBalance,
          status: newBalance === 0 ? 'SOLD_OUT' : batch.status,
          updated_at: db.fn.now(),
        });

        // Insert Order Item
        await trx('order_items').insert({
          order_id: orderId,
          batch_id: batch.id,
          product_id: item.product_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        });

        // Write immutable ledger movement
        await trx('inventory_movements').insert({
          batch_id: batch.id,
          movement_type: 'SALE_DEDUCTION',
          quantity_change: -item.quantity,
          resulting_balance: newBalance,
          reference_type: 'ORDER',
          reference_id: invoice_number,
          notes: `Sold ${item.quantity} plants on invoice ${invoice_number}`,
          created_by_user_id: req.user!.id,
          created_at: db.fn.now(),
        });
      }

      return { orderId, invoice_number, totalAmount };
    });

    await AuditService.log({
      userId: req.user!.id,
      action: 'RECORD_SALE',
      entityType: 'ORDER',
      entityId: result.orderId,
      newValues: { invoice_number: result.invoice_number, total: result.totalAmount },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: `Sale recorded. Invoice ${result.invoice_number} created for ₹${result.totalAmount}.`,
      order: result,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 3. GET ORDERS LIST
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await db('orders')
      .join('customers', 'orders.customer_id', 'customers.id')
      .select('orders.*', 'customers.name as customer_name', 'customers.phone as customer_phone')
      .orderBy('orders.created_at', 'desc');

    return res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// 4. PRINTABLE INVOICE GENERATION
router.get('/orders/:id/invoice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await db('orders')
      .join('customers', 'orders.customer_id', 'customers.id')
      .where('orders.id', id)
      .select('orders.*', 'customers.name as customer_name', 'customers.phone as customer_phone', 'customers.address as customer_address', 'customers.gst_or_tax_id')
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const items = await db('order_items')
      .join('batches', 'order_items.batch_id', 'batches.id')
      .where('order_items.order_id', order.id)
      .select('order_items.*', 'batches.serial_number', 'batches.plant_variety');

    const nurserySettings = await db('settings').select('key', 'value');
    const settingsMap: Record<string, string> = {};
    for (const s of nurserySettings) settingsMap[s.key] = s.value;

    const printableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${order.invoice_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1c1917; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #244930; padding-bottom: 20px; }
          .farm-name { font-size: 22px; font-weight: bold; color: #244930; }
          .invoice-tag { font-size: 24px; font-weight: bold; color: #57534e; text-align: right; }
          .details { display: grid; grid-template-columns: 1fr 1fr; margin: 24px 0; gap: 20px; }
          .box { background: #fbf9f6; padding: 16px; border-radius: 8px; border: 1px solid #e7e5e4; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #244930; color: #fff; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e7e5e4; font-size: 14px; }
          .total-box { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
          .footer { margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 16px; font-size: 12px; color: #78716c; text-align: center; }
          .no-print { margin-bottom: 20px; text-align: right; }
          .print-btn {
            background: #244930;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .print-btn:hover {
            background: #1b3824;
            transform: translateY(-1px);
          }
          @media print {
            body { padding: 0; margin: 0; }
            .no-print, button { display: none !important; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button id="printBtn" type="button" class="print-btn" onclick="triggerPrint()">
            🖨️ Print / Save as PDF
          </button>
        </div>
        <div class="header">
          <div>
            <div class="farm-name">${settingsMap.site_name || '[SAMPLE DATA] Deep Root Farms'}</div>
            <div style="font-size: 13px; color: #57534e; margin-top: 4px;">${settingsMap.contact_address || 'Agri Zone'}</div>
            <div style="font-size: 13px; color: #57534e;">Phone: ${settingsMap.contact_phone || '+91 98765 43210'}</div>
            <div style="font-size: 12px; color: #15803d; font-weight: bold; margin-top: 4px;">Certified Botanical Material</div>
          </div>
          <div class="invoice-tag">
            TAX INVOICE
            <div style="font-size: 15px; font-family: monospace; margin-top: 4px; color: #1c1917;">${order.invoice_number}</div>
            <div style="font-size: 13px; color: #57534e; font-weight: normal;">Date: ${order.order_date}</div>
          </div>
        </div>

        <div class="details">
          <div class="box">
            <div style="font-size: 12px; text-transform: uppercase; color: #78716c; font-weight: bold;">Billed To:</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 4px;">${order.customer_name}</div>
            <div style="font-size: 13px; color: #57534e; margin-top: 2px;">${order.customer_address || 'N/A'}</div>
            <div style="font-size: 13px; color: #57534e;">Phone: ${order.customer_phone || 'N/A'}</div>
            ${order.gst_or_tax_id ? `<div style="font-size: 12px; color: #57534e;">GSTIN: ${order.gst_or_tax_id}</div>` : ''}
          </div>
          <div class="box">
            <div style="font-size: 12px; text-transform: uppercase; color: #78716c; font-weight: bold;">Payment Details:</div>
            <div style="font-size: 14px; margin-top: 4px;">Mode: <strong>${order.payment_mode}</strong></div>
            <div style="font-size: 14px; margin-top: 2px;">Status: <strong>${order.payment_status}</strong></div>
            ${order.payment_notes ? `<div style="font-size: 12px; color: #57534e; margin-top: 4px;">Ref: ${order.payment_notes}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Variety / Cultivar</th>
              <th>Batch Tag</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${item.plant_variety}</strong></td>
                <td><code style="background: #e7e5e4; padding: 2px 6px; border-radius: 4px;">${item.serial_number}</code></td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">₹${item.unit_price.toFixed(2)}</td>
                <td style="text-align: right;"><strong>₹${item.total_price.toFixed(2)}</strong></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="total-box">
          Total Amount: <span style="color: #244930;">₹${order.total_amount.toFixed(2)}</span>
        </div>

        <div class="footer">
          <div>This is a computer-generated tax invoice for certified horticultural stock.</div>
          <div>All plant material carries verified rootstock and mother tree lineage. Thank you for your patronage!</div>
        </div>

        <script>
          function triggerPrint() {
            try {
              window.focus();
              window.print();
            } catch (err) {
              console.error('Print trigger error:', err);
            }
          }

          document.addEventListener('DOMContentLoaded', function() {
            var btn = document.getElementById('printBtn');
            if (btn) {
              btn.addEventListener('click', triggerPrint);
            }
            var urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('print') === 'true' || urlParams.get('autoprint') === 'true') {
              setTimeout(triggerPrint, 400);
            }
          });
        </script>
      </body>
      </html>
    `;

    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(printableHtml);
  } catch (err) {
    next(err);
  }
});

export default router;

