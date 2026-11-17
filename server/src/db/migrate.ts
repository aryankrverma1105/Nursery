import { db } from './connection.js';

export async function up(): Promise<void> {
  console.log('[MIGRATION] Running database schema creation...');

  // 1. Settings
  if (!(await db.schema.hasTable('settings'))) {
    await db.schema.createTable('settings', (table) => {
      table.string('key').primary();
      table.text('value').notNullable();
      table.string('description').nullable();
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 2. Sequences for atomic sequence generation
  if (!(await db.schema.hasTable('sequences'))) {
    await db.schema.createTable('sequences', (table) => {
      table.string('name').primary();
      table.integer('current_val').defaultTo(0).notNullable();
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 3. Identifiers
  if (!(await db.schema.hasTable('identifiers'))) {
    await db.schema.createTable('identifiers', (table) => {
      table.increments('id').primary();
      table.string('entity_type').notNullable(); // BATCH, PRODUCT, ORDER, SEED_LOT
      table.integer('entity_id').notNullable();
      table.string('scheme').notNullable(); // SERIAL, QR, BARCODE
      table.string('value').notNullable().unique();
      table.string('status').defaultTo('ACTIVE').notNullable(); // ACTIVE, RETIRED
      table.timestamp('issued_at').defaultTo(db.fn.now());
      table.timestamp('retired_at').nullable();
    });
    await db.schema.table('identifiers', (table) => {
      table.index(['entity_type', 'entity_id']);
      table.index(['value']);
    });
  }

  // 4. Users
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('full_name').notNullable();
      table.string('role').notNullable(); // ADMIN, SUPERVISOR, USER
      table.boolean('is_active').defaultTo(true);
      table.boolean('force_password_change').defaultTo(false);
      table.text('permissions').defaultTo('[]'); // JSON array
      table.text('assigned_records').defaultTo('[]'); // JSON array
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('lockout_until').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 5. Password Reset Tokens
  if (!(await db.schema.hasTable('password_reset_tokens'))) {
    await db.schema.createTable('password_reset_tokens', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('used_at').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 6. Audit Logs
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').nullable();
      table.string('action').notNullable(); // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, PUBLISH, QUARANTINE, SALE
      table.string('entity_type').notNullable();
      table.string('entity_id').nullable();
      table.text('old_values').nullable(); // JSON
      table.text('new_values').nullable(); // JSON
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 7. CMS Sections
  if (!(await db.schema.hasTable('cms_sections'))) {
    await db.schema.createTable('cms_sections', (table) => {
      table.increments('id').primary();
      table.string('section_key').notNullable().unique(); // hero, about, featured, categories, why_us, banners, gallery, testimonials, contact
      table.integer('display_order').defaultTo(0);
      table.boolean('is_enabled').defaultTo(true);
      table.string('title').nullable();
      table.string('subtitle').nullable();
      table.text('content').nullable(); // JSON configuration
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 8. CMS Banners
  if (!(await db.schema.hasTable('cms_banners'))) {
    await db.schema.createTable('cms_banners', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.string('subtitle').nullable();
      table.string('badge_text').nullable();
      table.string('image_url').nullable();
      table.string('link_url').nullable();
      table.timestamp('start_date').nullable();
      table.timestamp('expiry_date').nullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('display_order').defaultTo(0);
      table.boolean('is_archived').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 9. Categories
  if (!(await db.schema.hasTable('categories'))) {
    await db.schema.createTable('categories', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('slug').notNullable().unique();
      table.text('description').nullable();
      table.string('image_url').nullable();
      table.integer('display_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
    });
  }

  // 10. Products
  if (!(await db.schema.hasTable('products'))) {
    await db.schema.createTable('products', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('slug').notNullable().unique();
      table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL').nullable();
      table.text('short_description').nullable();
      table.text('full_description').nullable();
      table.text('images').defaultTo('[]'); // JSON array
      table.float('price').nullable();
      table.boolean('is_price_on_request').defaultTo(false);
      table.boolean('is_featured').defaultTo(false);
      table.boolean('is_published').defaultTo(true);
      table.boolean('is_archived').defaultTo(false);
      table.text('specs').defaultTo('{}'); // JSON key-value
      table.integer('display_order').defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 11. Suppliers
  if (!(await db.schema.hasTable('suppliers'))) {
    await db.schema.createTable('suppliers', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('contact_person').nullable();
      table.string('phone').nullable();
      table.string('email').nullable();
      table.text('address').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 12. Seed Lots
  if (!(await db.schema.hasTable('seed_lots'))) {
    await db.schema.createTable('seed_lots', (table) => {
      table.increments('id').primary();
      table.string('lot_code').notNullable().unique();
      table.integer('supplier_id').references('id').inTable('suppliers').onDelete('RESTRICT').nullable();
      table.string('plant_variety').notNullable();
      table.date('purchase_date').notNullable();
      table.float('initial_weight_grams').defaultTo(0);
      table.integer('seeds_count').defaultTo(0);
      table.float('germination_rate_tested').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 13. Mother Trees
  if (!(await db.schema.hasTable('mother_trees'))) {
    await db.schema.createTable('mother_trees', (table) => {
      table.increments('id').primary();
      table.string('tree_code').notNullable().unique();
      table.string('plant_variety').notNullable();
      table.string('location_block').notNullable();
      table.integer('age_years').defaultTo(1);
      table.string('health_status').defaultTo('HEALTHY'); // HEALTHY, STRESSED, QUARANTINED
      table.text('notes').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 14. Batches
  if (!(await db.schema.hasTable('batches'))) {
    await db.schema.createTable('batches', (table) => {
      table.increments('id').primary();
      table.string('batch_type').notNullable(); // ROOTSTOCK, SCION, GRAFTED, READY_FOR_SALE
      table.string('serial_number').notNullable().unique();
      table.string('plant_variety').notNullable();
      table.string('status').defaultTo('ACTIVE').notNullable(); // ACTIVE, CURING, READY, SOLD_OUT, QUARANTINED, ARCHIVED
      table.integer('initial_quantity').notNullable();
      table.integer('current_quantity').notNullable();
      table.string('location').nullable();
      table.text('notes').nullable();
      table.timestamp('quarantined_at').nullable();
      table.text('quarantine_reason').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    await db.schema.table('batches', (table) => {
      table.index(['batch_type', 'status']);
      table.index(['serial_number']);
    });
  }

  // 15. Product Batch Links (Derives public availability from ready-for-sale batches)
  if (!(await db.schema.hasTable('product_batch_links'))) {
    await db.schema.createTable('product_batch_links', (table) => {
      table.increments('id').primary();
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.integer('batch_id').references('id').inTable('batches').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 16. Batch Lineage (Parent-Child relationships)
  if (!(await db.schema.hasTable('batch_lineage'))) {
    await db.schema.createTable('batch_lineage', (table) => {
      table.increments('id').primary();
      table.integer('batch_id').references('id').inTable('batches').onDelete('RESTRICT');
      table.integer('parent_batch_id').references('id').inTable('batches').onDelete('RESTRICT');
      table.string('relationship_type').notNullable(); // ROOTSTOCK_PARENT, SCION_PARENT, SPLIT_FROM, PROMOTED_FROM
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 17. Sowing Records
  if (!(await db.schema.hasTable('sowing_records'))) {
    await db.schema.createTable('sowing_records', (table) => {
      table.increments('id').primary();
      table.integer('batch_id').references('id').inTable('batches').onDelete('CASCADE');
      table.integer('seed_lot_id').references('id').inTable('seed_lots').onDelete('RESTRICT');
      table.integer('seeds_sown').notNullable();
      table.date('sowing_date').notNullable();
      table.integer('germination_count').defaultTo(0);
      table.date('germination_date').nullable();
      table.float('germination_percent').defaultTo(0);
      table.integer('live_count').defaultTo(0);
      table.integer('mortality_count').defaultTo(0);
      table.text('notes').nullable();
    });
  }

  // 18. Scion Harvest Records
  if (!(await db.schema.hasTable('scion_harvest_records'))) {
    await db.schema.createTable('scion_harvest_records', (table) => {
      table.increments('id').primary();
      table.integer('batch_id').references('id').inTable('batches').onDelete('CASCADE');
      table.integer('mother_tree_id').references('id').inTable('mother_trees').onDelete('RESTRICT');
      table.date('harvest_date').notNullable();
      table.integer('cuttings_harvested').notNullable();
      table.string('technician_name').nullable();
      table.text('notes').nullable();
    });
  }

  // 19. Grafting Records
  if (!(await db.schema.hasTable('grafting_records'))) {
    await db.schema.createTable('grafting_records', (table) => {
      table.increments('id').primary();
      table.integer('batch_id').references('id').inTable('batches').onDelete('CASCADE');
      table.integer('rootstock_batch_id').references('id').inTable('batches').onDelete('RESTRICT');
      table.integer('scion_batch_id').references('id').inTable('batches').onDelete('RESTRICT');
      table.integer('mother_tree_id').references('id').inTable('mother_trees').onDelete('RESTRICT').nullable();
      table.string('technician_name').notNullable();
      table.date('grafting_date').notNullable();
      table.integer('quantity_grafted').notNullable();
      table.integer('successful_count').defaultTo(0);
      table.integer('failed_count').defaultTo(0);
      table.integer('curing_days').defaultTo(21);
      table.float('survival_rate').defaultTo(0);
      table.text('notes').nullable();
    });
  }

  // 20. Curing & Mortality Records
  if (!(await db.schema.hasTable('curing_mortality_records'))) {
    await db.schema.createTable('curing_mortality_records', (table) => {
      table.increments('id').primary();
      table.integer('batch_id').references('id').inTable('batches').onDelete('CASCADE');
      table.timestamp('recorded_at').defaultTo(db.fn.now());
      table.string('record_type').notNullable(); // CURING_CHECK, MORTALITY_LOG, ROUTINE_INSPECTION
      table.integer('healthy_count').notNullable();
      table.integer('mortality_count').notNullable();
      table.string('cause_of_death').nullable();
      table.integer('logged_by_user_id').nullable();
      table.text('notes').nullable();
    });
  }

  // 21. Inventory Movements (Immutable Ledger)
  if (!(await db.schema.hasTable('inventory_movements'))) {
    await db.schema.createTable('inventory_movements', (table) => {
      table.increments('id').primary();
      table.integer('batch_id').references('id').inTable('batches').onDelete('CASCADE');
      table.string('movement_type').notNullable(); // SOWING, GERMINATION, SCION_HARVEST, GRAFTING_IN, GRAFTING_OUT, MORTALITY, READY_PROMOTION, SALE_DEDUCTION, QUARANTINE_HOLD, QUARANTINE_RELEASE, ADJUSTMENT
      table.integer('quantity_change').notNullable(); // can be positive or negative
      table.integer('resulting_balance').notNullable();
      table.string('reference_type').nullable(); // SOWING, GRAFTING, ORDER, AUDIT
      table.string('reference_id').nullable();
      table.text('notes').nullable();
      table.integer('created_by_user_id').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    await db.schema.table('inventory_movements', (table) => {
      table.index(['batch_id']);
    });
  }

  // 22. Customers
  if (!(await db.schema.hasTable('customers'))) {
    await db.schema.createTable('customers', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('phone').nullable();
      table.string('email').nullable();
      table.text('address').nullable();
      table.string('company_name').nullable();
      table.string('gst_or_tax_id').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 23. Orders
  if (!(await db.schema.hasTable('orders'))) {
    await db.schema.createTable('orders', (table) => {
      table.increments('id').primary();
      table.string('invoice_number').notNullable().unique();
      table.integer('customer_id').references('id').inTable('customers').onDelete('RESTRICT');
      table.date('order_date').notNullable();
      table.float('total_amount').notNullable();
      table.string('payment_mode').defaultTo('CASH'); // CASH, BANK_TRANSFER, UPI, CHEQUE, CREDIT
      table.string('payment_status').defaultTo('PENDING'); // PENDING, PAID, PARTIAL
      table.text('payment_notes').nullable();
      table.string('status').defaultTo('CONFIRMED'); // CONFIRMED, DELIVERED, CANCELLED
      table.integer('created_by_user_id').nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 24. Order Items
  if (!(await db.schema.hasTable('order_items'))) {
    await db.schema.createTable('order_items', (table) => {
      table.increments('id').primary();
      table.integer('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.integer('batch_id').references('id').inTable('batches').onDelete('RESTRICT');
      table.integer('product_id').references('id').inTable('products').onDelete('SET NULL').nullable();
      table.integer('quantity').notNullable();
      table.float('unit_price').notNullable();
      table.float('total_price').notNullable();
      table.text('notes').nullable();
    });
  }

  // 25. Testimonials
  if (!(await db.schema.hasTable('testimonials'))) {
    await db.schema.createTable('testimonials', (table) => {
      table.increments('id').primary();
      table.string('author_name').notNullable();
      table.string('author_role').nullable();
      table.text('content').notNullable();
      table.integer('rating').defaultTo(5);
      table.string('avatar_url').nullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('display_order').defaultTo(0);
    });
  }

  // 26. Gallery Items
  if (!(await db.schema.hasTable('gallery_items'))) {
    await db.schema.createTable('gallery_items', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.string('caption').nullable();
      table.string('category').defaultTo('General');
      table.string('image_url').notNullable();
      table.integer('display_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
    });
  }

  // 27. Enquiries
  if (!(await db.schema.hasTable('enquiries'))) {
    await db.schema.createTable('enquiries', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').nullable();
      table.string('phone').nullable();
      table.string('subject').nullable();
      table.text('message').notNullable();
      table.string('status').defaultTo('NEW'); // NEW, IN_PROGRESS, RESOLVED, SPAM
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  console.log('[MIGRATION] Database schema migration completed successfully.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  up().then(() => {
    console.log('[MIGRATION] Done.');
    process.exit(0);
  }).catch((err) => {
    console.error('[MIGRATION ERROR]', err);
    process.exit(1);
  });
}
