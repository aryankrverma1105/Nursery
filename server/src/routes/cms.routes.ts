import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { invalidatePublicCache } from './public.routes.js';
import { AuditService } from '../services/audit/AuditService.js';

const router = Router();

// Restrict all CMS endpoints to ADMIN or authorized SUPERVISOR
router.use(requireAuth, requireRole(['ADMIN', 'SUPERVISOR']));

// 1. GET ALL HOMEPAGE SECTIONS
router.get('/sections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sections = await db('cms_sections').orderBy('display_order', 'asc');
    const parsed = sections.map((s) => ({
      ...s,
      content: typeof s.content === 'string' ? JSON.parse(s.content || '{}') : s.content || {},
    }));
    return res.json({ sections: parsed });
  } catch (err) {
    next(err);
  }
});

// 2. UPDATE HOMEPAGE SECTION (Reordering, Toggling, Content)
router.put('/sections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, subtitle, is_enabled, display_order, content } = req.body;

    const existing = await db('cms_sections').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    await db('cms_sections')
      .where({ id })
      .update({
        title: title !== undefined ? title : existing.title,
        subtitle: subtitle !== undefined ? subtitle : existing.subtitle,
        is_enabled: is_enabled !== undefined ? is_enabled : existing.is_enabled,
        display_order: display_order !== undefined ? display_order : existing.display_order,
        content: content ? JSON.stringify(content) : existing.content,
        updated_at: db.fn.now(),
      });

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'UPDATE_CMS_SECTION',
      entityType: 'CMS_SECTION',
      entityId: id,
      newValues: { title, is_enabled, display_order },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Homepage section updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 3. BANNERS CRUD
router.get('/banners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await db('cms_banners').orderBy('display_order', 'asc');
    return res.json({ banners });
  } catch (err) {
    next(err);
  }
});

router.post('/banners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, subtitle, badge_text, image_url, link_url, start_date, expiry_date, is_active } = req.body;
    const [inserted] = await db('cms_banners')
      .insert({
        title,
        subtitle,
        badge_text,
        image_url,
        link_url,
        start_date: start_date || null,
        expiry_date: expiry_date || null,
        is_active: is_active !== undefined ? is_active : true,
        created_at: db.fn.now(),
      })
      .returning('*');

    invalidatePublicCache();
    return res.status(201).json({ banner: inserted });
  } catch (err) {
    next(err);
  }
});

router.put('/banners/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await db('cms_banners').where({ id }).update(updates);
    invalidatePublicCache();
    return res.json({ message: 'Banner updated successfully.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/banners/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db('cms_banners').where({ id }).update({ is_archived: true, is_active: false });
    invalidatePublicCache();
    return res.json({ message: 'Banner archived successfully.' });
  } catch (err) {
    next(err);
  }
});

// 4. PRODUCT CATALOGUE MANAGEMENT (CRUD & Batch Linking)
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await db('products')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select('products.*', 'categories.name as category_name')
      .orderBy('products.created_at', 'desc');

    const enriched = await Promise.all(
      products.map(async (p) => {
        const links = await db('product_batch_links')
          .join('batches', 'product_batch_links.batch_id', 'batches.id')
          .where('product_batch_links.product_id', p.id)
          .select('batches.id', 'batches.serial_number', 'batches.current_quantity', 'batches.status');

        return {
          ...p,
          images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : p.images,
          specs: typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : p.specs,
          linkedBatches: links,
        };
      })
    );

    return res.json({ products: enriched });
  } catch (err) {
    next(err);
  }
});

router.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category_id, short_description, full_description, price, is_price_on_request, is_featured, is_published, specs, images, linkedBatchIds } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

    const [inserted] = await db('products')
      .insert({
        name,
        slug,
        category_id: category_id || null,
        short_description,
        full_description,
        price: is_price_on_request ? null : price,
        is_price_on_request: Boolean(is_price_on_request),
        is_featured: Boolean(is_featured),
        is_published: is_published !== undefined ? Boolean(is_published) : true,
        specs: specs ? JSON.stringify(specs) : '{}',
        images: images ? JSON.stringify(images) : '[]',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('id');

    const productId = typeof inserted === 'object' ? inserted.id : inserted;

    if (Array.isArray(linkedBatchIds) && linkedBatchIds.length > 0) {
      for (const batchId of linkedBatchIds) {
        await db('product_batch_links').insert({
          product_id: productId,
          batch_id: batchId,
          created_at: db.fn.now(),
        });
      }
    }

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'CREATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: productId,
      newValues: { name, slug },
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Product created successfully.', productId });
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, category_id, short_description, full_description, price, is_price_on_request, is_featured, is_published, specs, images, linkedBatchIds } = req.body;

    await db('products')
      .where({ id })
      .update({
        name,
        category_id: category_id || null,
        short_description,
        full_description,
        price: is_price_on_request ? null : price,
        is_price_on_request: Boolean(is_price_on_request),
        is_featured: Boolean(is_featured),
        is_published: Boolean(is_published),
        specs: specs ? JSON.stringify(specs) : undefined,
        images: images ? JSON.stringify(images) : undefined,
        updated_at: db.fn.now(),
      });

    if (Array.isArray(linkedBatchIds)) {
      await db('product_batch_links').where({ product_id: id }).delete();
      for (const batchId of linkedBatchIds) {
        await db('product_batch_links').insert({
          product_id: id,
          batch_id: batchId,
          created_at: db.fn.now(),
        });
      }
    }

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'UPDATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: id,
      newValues: { name },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 5. WEBSITE SETTINGS (Admin only)
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await db('settings').select('*');
    return res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body; // Record<string, string>
    if (settings && typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings)) {
        await db('settings')
          .where({ key })
          .update({
            value: String(value),
            updated_at: db.fn.now(),
          });
      }
    }

    invalidatePublicCache();

    await AuditService.log({
      userId: req.user!.id,
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTINGS',
      newValues: settings,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Settings saved successfully.' });
  } catch (err) {
    next(err);
  }
});

// 6. ENQUIRIES MANAGEMENT
router.get('/enquiries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enquiries = await db('enquiries').orderBy('created_at', 'desc');
    return res.json({ enquiries });
  } catch (err) {
    next(err);
  }
});

router.patch('/enquiries/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    await db('enquiries').where({ id }).update({
      status,
      notes,
      updated_at: db.fn.now(),
    });
    return res.json({ message: 'Enquiry updated successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;

