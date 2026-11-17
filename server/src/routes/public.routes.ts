import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { enquiryRateLimiter } from '../middleware/auth.js';

const router = Router();

// In-memory cache for public responses with invalidation
let publicCache: Record<string, { timestamp: number; data: any }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

export function invalidatePublicCache() {
  publicCache = {};
  console.log('[CACHE] Public cache invalidated.');
}

// 1. GET WEBSITE SETTINGS & BRANDING
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settingsRows = await db('settings').select('key', 'value');
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }
    return res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// 2. GET HOMEPAGE SECTIONS & CONTENT
router.get('/homepage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'homepage';
    const cached = publicCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    // A. Enabled sections ordered by display_order
    const sections = await db('cms_sections')
      .where({ is_enabled: true })
      .orderBy('display_order', 'asc');

    // Parse JSON content
    const parsedSections = sections.map((s) => ({
      ...s,
      content: typeof s.content === 'string' ? JSON.parse(s.content || '{}') : s.content || {},
    }));

    // B. Active, non-expired banners
    const now = new Date();
    const banners = await db('cms_banners')
      .where({ is_active: true, is_archived: false })
      .andWhere(function () {
        this.whereNull('start_date').orWhere('start_date', '<=', now);
      })
      .andWhere(function () {
        this.whereNull('expiry_date').orWhere('expiry_date', '>=', now);
      })
      .orderBy('display_order', 'asc');

    // C. Categories
    const categories = await db('categories')
      .where({ is_active: true })
      .orderBy('display_order', 'asc');

    // D. Featured Products with derived availability
    const featuredProducts = await db('products')
      .where({ is_featured: true, is_published: true, is_archived: false })
      .orderBy('display_order', 'asc')
      .limit(6);

    const enrichedFeatured = await Promise.all(
      featuredProducts.map(async (prod) => {
        const avail = await computeProductAvailability(prod.id);
        return {
          ...prod,
          images: typeof prod.images === 'string' ? JSON.parse(prod.images || '[]') : prod.images,
          specs: typeof prod.specs === 'string' ? JSON.parse(prod.specs || '{}') : prod.specs,
          availability: avail.status,
          availableQuantity: avail.quantity,
        };
      })
    );

    // E. Testimonials
    const testimonials = await db('testimonials')
      .where({ is_active: true })
      .orderBy('display_order', 'asc');

    // F. Gallery items
    const gallery = await db('gallery_items')
      .where({ is_active: true })
      .orderBy('display_order', 'asc')
      .limit(8);

    const data = {
      sections: parsedSections,
      banners,
      categories,
      featuredProducts: enrichedFeatured,
      testimonials,
      gallery,
    };

    publicCache[cacheKey] = { timestamp: Date.now(), data };
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// 3. GET CATEGORIES
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await db('categories').where({ is_active: true }).orderBy('display_order', 'asc');
    return res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// Helper: Compute public availability derived strictly from linked, non-quarantined READY_FOR_SALE batches
export async function computeProductAvailability(productId: number): Promise<{ status: 'In Stock' | 'Limited Stock' | 'Out of Stock' | 'Coming Soon'; quantity: number }> {
  // Find linked ready-for-sale batches
  const linkedBatches = await db('product_batch_links')
    .join('batches', 'product_batch_links.batch_id', 'batches.id')
    .where('product_batch_links.product_id', productId)
    .andWhere('batches.batch_type', 'READY_FOR_SALE')
    .andWhere('batches.status', 'READY')
    .whereNull('batches.quarantined_at')
    .select('batches.current_quantity');

  if (!linkedBatches || linkedBatches.length === 0) {
    // Check if there are active grafted batches in curing linked or matching variety
    return { status: 'Coming Soon', quantity: 0 };
  }

  const totalQuantity = linkedBatches.reduce((acc, b) => acc + (b.current_quantity || 0), 0);

  if (totalQuantity <= 0) {
    return { status: 'Out of Stock', quantity: 0 };
  } else if (totalQuantity < 25) {
    return { status: 'Limited Stock', quantity: totalQuantity };
  } else {
    return { status: 'In Stock', quantity: totalQuantity };
  }
}

// 4. GET PRODUCT CATALOGUE (Search, Filter, Pagination)
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, page = '1', limit = '12' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    let query = db('products')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .where('products.is_published', true)
      .andWhere('products.is_archived', false)
      .select('products.*', 'categories.name as category_name', 'categories.slug as category_slug');

    if (category && category !== 'all') {
      query = query.andWhere('categories.slug', category as string);
    }

    if (search) {
      const term = `%${String(search).trim()}%`;
      query = query.andWhere(function () {
        this.whereRaw('LOWER(products.name) LIKE ?', [term.toLowerCase()]).orWhereRaw(
          'LOWER(products.short_description) LIKE ?',
          [term.toLowerCase()]
        );
      });
    }

    const countQuery = query.clone().clearSelect().count('products.id as count').first();
    const countResult: any = await countQuery;
    const totalCount = parseInt(countResult?.count || '0', 10);

    const products = await query.orderBy('products.display_order', 'asc').limit(limitNum).offset(offset);

    const enriched = await Promise.all(
      products.map(async (prod) => {
        const avail = await computeProductAvailability(prod.id);
        return {
          ...prod,
          images: typeof prod.images === 'string' ? JSON.parse(prod.images || '[]') : prod.images,
          specs: typeof prod.specs === 'string' ? JSON.parse(prod.specs || '{}') : prod.specs,
          availability: avail.status,
          availableQuantity: avail.quantity,
        };
      })
    );

    return res.json({
      products: enriched,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 5. GET PRODUCT DETAILS BY SLUG
router.get('/products/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const product = await db('products')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .where('products.slug', slug)
      .andWhere('products.is_published', true)
      .andWhere('products.is_archived', false)
      .select('products.*', 'categories.name as category_name', 'categories.slug as category_slug')
      .first();

    if (!product) {
      return res.status(404).json({ error: 'Catalogue product not found.' });
    }

    const avail = await computeProductAvailability(product.id);

    // Get nursery whatsapp & site_name setting for direct wa.me link
    const whatsappSetting = await db('settings').where({ key: 'contact_whatsapp' }).first();
    const siteNameSetting = await db('settings').where({ key: 'site_name' }).first();
    const farmName = siteNameSetting?.value?.replace(' [SAMPLE DATA]', '') || 'Deep Root Farms';
    const waNumber = whatsappSetting?.value || '919876543210';
    const waMessage = encodeURIComponent(
      `Hello ${farmName}, I am interested in inquiring about "${product.name}" (SKU: ${product.slug}). Could you please share availability and planting advice?`
    );
    const whatsappUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

    return res.json({
      product: {
        ...product,
        images: typeof product.images === 'string' ? JSON.parse(product.images || '[]') : product.images,
        specs: typeof product.specs === 'string' ? JSON.parse(product.specs || '{}') : product.specs,
        availability: avail.status,
        availableQuantity: avail.quantity,
        whatsappUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 6. GET GALLERY
router.get('/gallery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    let query = db('gallery_items').where({ is_active: true }).orderBy('display_order', 'asc');
    if (category && category !== 'all') {
      query = query.andWhere({ category: category as string });
    }
    const items = await query;
    return res.json({ gallery: items });
  } catch (err) {
    next(err);
  }
});

// 7. SUBMIT ENQUIRY (with Honeypot Spam Protection & Rate Limiting)
const EnquirySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().min(6, 'Valid phone number is required'),
  subject: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
  botField: z.string().optional(), // Honeypot trap: bots fill this hidden field!
});

router.post('/enquiry', enquiryRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, subject, message, botField } = EnquirySchema.parse(req.body);

    // Honeypot spam check: if filled, silently discard or mark spam
    if (botField) {
      console.warn(`[SPAM BLOCKED] Honeypot field filled by ${req.ip}`);
      return res.json({ message: 'Thank you for your enquiry. Our team will contact you shortly.' });
    }

    await db('enquiries').insert({
      name,
      email: email || null,
      phone: phone || null,
      subject: subject || 'General Catalogue Enquiry',
      message,
      status: 'NEW',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return res.json({
      message: 'Thank you for contacting Deep Root Farms. Our agronomists will review your request and get back to you shortly.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

