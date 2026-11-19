import { db } from './connection.js';
import bcrypt from 'bcryptjs';
import { up as runMigrations } from './migrate.js';
import identifierService from '../services/identifier/IdentifierService.js';

export async function seed(isSampleData: boolean = true) {
  console.log(`[SEED] Seeding database (isSampleData = ${isSampleData})...`);
  await runMigrations();

  const isDevMarker = isSampleData ? ' [SAMPLE DATA]' : '';

  // 1. Core Settings
  const defaultSettings = [
    { key: 'site_name', value: `Deep Root Farms${isDevMarker}`, description: 'Public farm name' },
    { key: 'site_tagline', value: 'Specialized Fruit Trees, Rootstocks & Indigenous Plants', description: 'Hero tagline' },
    { key: 'contact_phone', value: '+91 98765 43210', description: 'Official Phone' },
    { key: 'contact_whatsapp', value: '919876543210', description: 'WhatsApp number for wa.me enquiries' },
    { key: 'contact_email', value: 'info@deeprootfarms.local', description: 'Public enquiry email' },
    { key: 'contact_address', value: `Survey No. 108, Riverside Highway, Agri Zone${isDevMarker}`, description: 'Physical nursery location' },
    { key: 'contact_maps_embed', value: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115000!2d77.2!3d28.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjjCsDM2JzAwLjAiTiA3N8KwMTInMDAuMCJF!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin', description: 'Google Maps embed URL' },
    { key: 'identifier_active_scheme', value: 'SERIAL', description: 'Active scheme: SERIAL, QR, BARCODE' },
    { key: 'identifier_serial_template', value: '{PREFIX}-{YYYY}-{SEQ:4}', description: 'Serial format template' },
    { key: 'identifier_prefix_rootstock', value: 'ROOT', description: 'Rootstock prefix' },
    { key: 'identifier_prefix_scion', value: 'SCION', description: 'Scion prefix' },
    { key: 'identifier_prefix_grafted', value: 'GRAFT', description: 'Grafted batch prefix' },
    { key: 'identifier_prefix_ready_for_sale', value: 'RFS', description: 'Ready for sale prefix' },
    { key: 'identifier_prefix_seed_lot', value: 'SEED', description: 'Seed lot prefix' },
    { key: 'identifier_prefix_order', value: 'SALE', description: 'Order invoice prefix' },
    { key: 'theme_primary_color', value: '#244930', description: 'Primary brand dark green' },
    { key: 'theme_accent_color', value: '#468f5c', description: 'Secondary natural green' },
    { key: 'currency_symbol', value: '₹', description: 'Nursery currency symbol' },
    { key: 'seo_title', value: `Deep Root Farms - Premium Horticulture & Certified Plants${isDevMarker}`, description: 'Default SEO Title' },
    { key: 'seo_description', value: 'Certified grafted plants, mother tree scions, vigorous rootstocks, and commercial orchard varieties.', description: 'Default SEO Meta Description' },
    { key: 'seo_keywords', value: 'horticulture, nursery, grafted mango, guava rootstocks, orchard plants', description: 'SEO Keywords' },
  ];

  for (const s of defaultSettings) {
    const exists = await db('settings').where({ key: s.key }).first();
    if (!exists) {
      await db('settings').insert({
        key: s.key,
        value: s.value,
        description: s.description,
        updated_at: db.fn.now(),
      });
    } else {
      await db('settings').where({ key: s.key }).update({
        value: s.value,
        description: s.description,
        updated_at: db.fn.now(),
      });
    }
  }

  // 2. Demo Users with Argon2/Bcrypt Password Hashes
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@12345', salt);
  const supervisorHash = await bcrypt.hash('Supervisor@12345', salt);
  const workerHash = await bcrypt.hash('Worker@12345', salt);

  const demoUsers = [
    {
      email: 'admin@nursery.local',
      password_hash: adminHash,
      full_name: 'Farm Administrator',
      role: 'ADMIN',
      is_active: true,
      force_password_change: false,
      permissions: JSON.stringify(['ALL']),
    },
    {
      email: 'supervisor@nursery.local',
      password_hash: supervisorHash,
      full_name: 'Field Supervisor Sharma',
      role: 'SUPERVISOR',
      is_active: true,
      force_password_change: false,
      permissions: JSON.stringify(['INVENTORY_READ', 'INVENTORY_WRITE', 'SALES_READ', 'SALES_WRITE', 'TRACE_READ', 'QUARANTINE_MANAGE']),
    },
    {
      email: 'worker@nursery.local',
      password_hash: workerHash,
      full_name: 'Technician Ramesh',
      role: 'USER',
      is_active: true,
      force_password_change: false,
      permissions: JSON.stringify(['INVENTORY_READ', 'INVENTORY_WRITE', 'TRACE_READ']),
    },
  ];

  for (const u of demoUsers) {
    const existing = await db('users').where({ email: u.email }).first();
    if (!existing) {
      await db('users').insert({
        ...u,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    }
  }

  // 3. CMS Sections
  const defaultSections = [
    {
      section_key: 'hero',
      display_order: 1,
      is_enabled: true,
      title: 'Cultivating Excellence from Seed to Orchard',
      subtitle: 'Certified grafted fruit varieties, robust disease-resistant rootstocks, and verified pedigree saplings for professional growers.',
      content: JSON.stringify({
        primaryCtaText: 'Browse Catalogue',
        primaryCtaLink: '/products',
        secondaryCtaText: 'Explore Farm & Lineage',
        secondaryCtaLink: '/about',
        heroBadge: 'ISO Certified Horticultural Practice',
        heroImage: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1600&q=80',
      }),
    },
    {
      section_key: 'about',
      display_order: 2,
      is_enabled: true,
      title: 'Our Heritage & Philosophy',
      subtitle: 'Three decades of scientific grafting, meticulous mother tree preservation, and verifiable batch traceability.',
      content: JSON.stringify({
        description: 'Deep Root Farms operates across 45 acres of specialized acclimatization poly-houses, propagation mist chambers, and authenticated germplasm conservation blocks. Every sapling leaving our gates carries a distinct verifiable pedigree trace.',
        stats: [
          { label: 'Verified Mother Trees', value: '450+' },
          { label: 'Annual Grafting Success', value: '94.2%' },
          { label: 'Certified Varieties', value: '60+' },
          { label: 'Commercial Growers Served', value: '1,200+' },
        ],
        badgeText: 'Traceable Horticulture',
      }),
    },
    {
      section_key: 'categories',
      display_order: 3,
      is_enabled: true,
      title: 'Botanical Specialties',
      subtitle: 'Select from our verified propagation lineages suited for commercial cultivation and high-density planting.',
      content: JSON.stringify({}),
    },
    {
      section_key: 'featured',
      display_order: 4,
      is_enabled: true,
      title: 'Featured Cultivars',
      subtitle: 'Currently ready for orchard transplanting with high vigor and verified rootstock compatibility.',
      content: JSON.stringify({}),
    },
    {
      section_key: 'why_us',
      display_order: 5,
      is_enabled: true,
      title: 'The Deep Root Standard',
      subtitle: 'Why progressive orchardists and commercial growers trust our plant material.',
      content: JSON.stringify({
        features: [
          {
            title: '100% Pedigree Lineage',
            description: 'Every grafted plant maps directly to tagged mother trees and authenticated scion harvesting batches.',
            icon: 'GitBranch',
          },
          {
            title: 'Controlled Curing Protocols',
            description: 'Strict 21-day acclimatization in monitored humidity chambers before release guarantees survival.',
            icon: 'ShieldCheck',
          },
          {
            title: 'Zero Unknown Germplasm',
            description: 'All seed lots and rootstocks undergo phytosanitary inspection and certified germination testing.',
            icon: 'Award',
          },
          {
            title: 'Scientific Root Pruning',
            description: 'Air-pot propagation develops dense fibrous root systems minimizing transplanting shock.',
            icon: 'Trees',
          },
        ],
      }),
    },
    {
      section_key: 'banners',
      display_order: 6,
      is_enabled: true,
      title: 'Seasonal Propagation Notices',
      subtitle: 'Upcoming graft allocations and advance seasonal booking.',
      content: JSON.stringify({}),
    },
    {
      section_key: 'gallery',
      display_order: 7,
      is_enabled: true,
      title: 'Propagation in Action',
      subtitle: 'A glimpse into our nursery shade houses, rootstock beds, and mother orchards.',
      content: JSON.stringify({}),
    },
    {
      section_key: 'testimonials',
      display_order: 8,
      is_enabled: true,
      title: 'Grower Experiences',
      subtitle: 'Feedback from commercial orchard managers and agro-forestry leaders.',
      content: JSON.stringify({}),
    },
    {
      section_key: 'contact',
      display_order: 9,
      is_enabled: true,
      title: 'Consult with Our Horticulturists',
      subtitle: 'Visit our propagation center or enquire about bulk seasonal orders.',
      content: JSON.stringify({}),
    },
  ];

  for (const sec of defaultSections) {
    const existing = await db('cms_sections').where({ section_key: sec.section_key }).first();
    if (!existing) {
      await db('cms_sections').insert({
        ...sec,
        updated_at: db.fn.now(),
      });
    }
  }

  // 4. Categories
  const categories = [
    { name: 'Grafted Mango Varieties', slug: 'grafted-mango', description: 'Certified commercial cultivars on vigorous polyembryonic rootstocks', image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80', display_order: 1 },
    { name: 'Guava High-Density Hybrids', slug: 'guava-hybrids', description: 'Wilt-resistant Taiwanese & VNR varieties with prolific bearing', image_url: 'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?auto=format&fit=crop&w=800&q=80', display_order: 2 },
    { name: 'Citrus & Lime Cultivars', slug: 'citrus-lime', description: 'Rangpur lime rootstock grafts with high canker resistance', image_url: 'https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=800&q=80', display_order: 3 },
    { name: 'Exotic & Dragon Fruit', slug: 'exotic-fruits', description: 'Red and yellow flesh varieties conditioned for semi-arid zones', image_url: 'https://images.unsplash.com/photo-1527325678964-54921661f888?auto=format&fit=crop&w=800&q=80', display_order: 4 },
    { name: 'Hardy Rootstock Seedlings', slug: 'rootstocks', description: 'Uniform taproot seedlings ready for budding and cleft grafting', image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80', display_order: 5 },
  ];

  for (const cat of categories) {
    const exists = await db('categories').where({ slug: cat.slug }).first();
    if (!exists) {
      await db('categories').insert(cat);
    }
  }

  // 5. Testimonials
  const sampleTestimonials = [
    {
      author_name: 'Dr. Virender Chauhan',
      author_role: 'Chief Horticulturalist, Shivalik Orchards',
      content: 'We planted 800 grafted Kesar saplings from Deep Root Farms two years ago. The batch traceability, root ball vigor, and uniformity of growth have exceeded all our survival expectations (98.4%).',
      rating: 5,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      display_order: 1,
      is_active: true,
    },
    {
      author_name: 'Ananya Deshmukh',
      author_role: 'Commercial Grower, 30-Acre Guava Plantation',
      content: 'Finding wilt-free rootstock lines was our biggest challenge. Deep Root Farms’ transparent mother tree records and curing logs gave us the scientific confidence we needed.',
      rating: 5,
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      display_order: 2,
      is_active: true,
    },
  ];

  for (const t of sampleTestimonials) {
    const exists = await db('testimonials').where({ author_name: t.author_name }).first();
    if (!exists) {
      await db('testimonials').insert(t);
    }
  }

  // 6. Gallery Items
  const sampleGallery = [
    { title: 'Mist Propagation Chamber 01', caption: 'High-humidity curing area for newly grafted clefts', category: 'Infrastructure', image_url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80', display_order: 1, is_active: true },
    { title: 'Mother Tree Block - Kesar Mango', caption: '22-year-old registered scion donor tree MT-01', category: 'Mother Trees', image_url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80', display_order: 2, is_active: true },
    { title: 'Rootstock Hardening Poly-Tunnel', caption: 'Acclimatized seedlings undergoing root training', category: 'Rootstocks', image_url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80', display_order: 3, is_active: true },
    { title: 'Batch Ready for Orchard Dispatch', caption: 'Hardened saplings with individual serial identifiers', category: 'Dispatch', image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80', display_order: 4, is_active: true },
  ];

  for (const g of sampleGallery) {
    const exists = await db('gallery_items').where({ title: g.title }).first();
    if (!exists) {
      await db('gallery_items').insert(g);
    }
  }

  // If sample data flag is enabled, populate inventory lineages, suppliers, seed lots, batches & orders
  if (isSampleData) {
    console.log('[SEED] Populating sample inventory, suppliers, batches, and catalogue products...');

    // A. Supplier
    let supplier = await db('suppliers').where({ name: `Himalayan Agro Seeds Co.${isDevMarker}` }).first();
    if (!supplier) {
      const [id] = await db('suppliers').insert({
        name: `Himalayan Agro Seeds Co.${isDevMarker}`,
        contact_person: 'Rajeev Malhotra',
        phone: '+91 98111 22334',
        email: 'sales@himalayanseeds.local',
        address: 'Sector 4, Seed Development Estate, Solan',
        is_active: true,
      }).returning('id');
      supplier = { id: typeof id === 'object' ? id.id : id };
    }

    // B. Seed Lot
    let seedLot = await db('seed_lots').where({ lot_code: 'SEED-2026-00001' }).first();
    if (!seedLot) {
      const [id] = await db('seed_lots').insert({
        lot_code: 'SEED-2026-00001',
        supplier_id: supplier.id,
        plant_variety: 'Desi Polyembryonic Mango (Vigorous Rootstock)',
        purchase_date: '2026-01-15',
        initial_weight_grams: 50000,
        seeds_count: 1500,
        germination_rate_tested: 92.5,
        is_active: true,
        notes: 'High drought tolerance, salt tolerant native selection.',
      }).returning('id');
      seedLot = { id: typeof id === 'object' ? id.id : id };
      await db('identifiers').insert({
        entity_type: 'SEED_LOT',
        entity_id: seedLot.id,
        scheme: 'SERIAL',
        value: 'SEED-2026-00001',
        status: 'ACTIVE',
      });
      await db('sequences').insert({ name: 'SEED_2026', current_val: 1, updated_at: db.fn.now() }).onConflict('name').merge();
    }

    // C. Mother Tree
    let motherTree = await db('mother_trees').where({ tree_code: 'MT-KESAR-01' }).first();
    if (!motherTree) {
      const [id] = await db('mother_trees').insert({
        tree_code: 'MT-KESAR-01',
        plant_variety: 'Gir Kesar Mango (Heritage Selection)',
        location_block: 'Block-A Mother Orchard (Row 3, Tree 12)',
        age_years: 18,
        health_status: 'HEALTHY',
        notes: 'Certified viral-free scion donor with consistent heavy flowering.',
        is_active: true,
      }).returning('id');
      motherTree = { id: typeof id === 'object' ? id.id : id };
    }

    // D. Rootstock Batch (Sown)
    let rootstockBatch = await db('batches').where({ serial_number: 'RS-2026-00001' }).first();
    if (!rootstockBatch) {
      const [id] = await db('batches').insert({
        batch_type: 'ROOTSTOCK',
        serial_number: 'RS-2026-00001',
        plant_variety: 'Desi Polyembryonic Mango',
        status: 'ACTIVE',
        initial_quantity: 800,
        current_quantity: 500, // 300 used for grafting
        location: 'Poly-tunnel Nursery Bed 2',
        notes: 'Sown in January 2026, excellent stem caliper of 8-10mm.',
      }).returning('id');
      const bId = typeof id === 'object' ? id.id : id;
      rootstockBatch = { id: bId };

      await db('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: bId,
        scheme: 'SERIAL',
        value: 'RS-2026-00001',
        status: 'ACTIVE',
      });
      await db('sequences').insert({ name: 'RS_2026', current_val: 1, updated_at: db.fn.now() }).onConflict('name').merge();

      await db('sowing_records').insert({
        batch_id: bId,
        seed_lot_id: seedLot.id,
        seeds_sown: 800,
        sowing_date: '2026-02-01',
        germination_count: 760,
        germination_date: '2026-02-22',
        germination_percent: 95.0,
        live_count: 740,
        mortality_count: 20,
        notes: 'Primary germination healthy and uniform.',
      });

      // Movements
      await db('inventory_movements').insert([
        {
          batch_id: bId,
          movement_type: 'SOWING',
          quantity_change: 800,
          resulting_balance: 800,
          reference_type: 'SOWING',
          notes: 'Initial seed sowing from SEED-2026-00001',
        },
        {
          batch_id: bId,
          movement_type: 'GRAFTING_IN',
          quantity_change: -300,
          resulting_balance: 500,
          reference_type: 'GRAFTING',
          notes: '300 stems consumed for grafting batch GR-2026-00001',
        },
      ]);
    }

    // E. Scion Batch (Harvested)
    let scionBatch = await db('batches').where({ serial_number: 'SC-2026-00001' }).first();
    if (!scionBatch) {
      const [id] = await db('batches').insert({
        batch_type: 'SCION',
        serial_number: 'SC-2026-00001',
        plant_variety: 'Gir Kesar Mango',
        status: 'ACTIVE',
        initial_quantity: 350,
        current_quantity: 50,
        location: 'Mist Storage Cooler 1',
        notes: 'Pre-defoliated terminal bud-sticks harvested from MT-KESAR-01.',
      }).returning('id');
      const bId = typeof id === 'object' ? id.id : id;
      scionBatch = { id: bId };

      await db('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: bId,
        scheme: 'SERIAL',
        value: 'SC-2026-00001',
        status: 'ACTIVE',
      });
      await db('sequences').insert({ name: 'SC_2026', current_val: 1, updated_at: db.fn.now() }).onConflict('name').merge();

      await db('scion_harvest_records').insert({
        batch_id: bId,
        mother_tree_id: motherTree.id,
        harvest_date: '2026-03-01',
        cuttings_harvested: 350,
        technician_name: 'Technician Ramesh',
        notes: 'Cuttings collected in early morning hours, moisture preserved.',
      });

      await db('inventory_movements').insert([
        {
          batch_id: bId,
          movement_type: 'SCION_HARVEST',
          quantity_change: 350,
          resulting_balance: 350,
          reference_type: 'SCION_HARVEST',
          notes: 'Fresh harvest from MT-KESAR-01',
        },
        {
          batch_id: bId,
          movement_type: 'GRAFTING_IN',
          quantity_change: -300,
          resulting_balance: 50,
          reference_type: 'GRAFTING',
          notes: '300 scions consumed for grafting batch GR-2026-00001',
        },
      ]);
    }

    // F. Grafted Batch
    let graftedBatch = await db('batches').where({ serial_number: 'GR-2026-00001' }).first();
    if (!graftedBatch) {
      const [id] = await db('batches').insert({
        batch_type: 'GRAFTED',
        serial_number: 'GR-2026-00001',
        plant_variety: 'Gir Kesar on Desi Rootstock',
        status: 'ACTIVE',
        initial_quantity: 300,
        current_quantity: 275,
        location: 'Acclimatization Shade House C',
        notes: 'Wedge-grafted with 95% initial union take.',
      }).returning('id');
      const bId = typeof id === 'object' ? id.id : id;
      graftedBatch = { id: bId };

      await db('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: bId,
        scheme: 'SERIAL',
        value: 'GR-2026-00001',
        status: 'ACTIVE',
      });
      await db('sequences').insert({ name: 'GR_2026', current_val: 1, updated_at: db.fn.now() }).onConflict('name').merge();

      // Lineage linking
      await db('batch_lineage').insert([
        {
          batch_id: bId,
          parent_batch_id: rootstockBatch.id,
          relationship_type: 'ROOTSTOCK_PARENT',
          notes: 'Rootstock derived from RS-2026-00001',
        },
        {
          batch_id: bId,
          parent_batch_id: scionBatch.id,
          relationship_type: 'SCION_PARENT',
          notes: 'Scion derived from SC-2026-00001',
        },
      ]);

      await db('grafting_records').insert({
        batch_id: bId,
        rootstock_batch_id: rootstockBatch.id,
        scion_batch_id: scionBatch.id,
        mother_tree_id: motherTree.id,
        technician_name: 'Technician Ramesh',
        grafting_date: '2026-03-05',
        quantity_grafted: 300,
        successful_count: 285,
        failed_count: 15,
        curing_days: 21,
        survival_rate: 95.0,
        notes: 'Very clean union healing with paraffin wrapping.',
      });

      await db('curing_mortality_records').insert({
        batch_id: bId,
        record_type: 'CURING_CHECK',
        healthy_count: 275,
        mortality_count: 10,
        cause_of_death: 'Graft union fungal desiccation on 10 units',
        notes: '21 days curing passed. Ready for hardening.',
      });

      await db('inventory_movements').insert([
        {
          batch_id: bId,
          movement_type: 'GRAFTING_OUT',
          quantity_change: 300,
          resulting_balance: 300,
          reference_type: 'GRAFTING',
          notes: 'Batch created from 300 grafted clefts',
        },
        {
          batch_id: bId,
          movement_type: 'MORTALITY',
          quantity_change: -25,
          resulting_balance: 275,
          reference_type: 'CURING_LOSS',
          notes: '15 failed takes + 10 post-curing mortality',
        },
      ]);
    }

    // G. Ready-for-Sale Batch (Promoted from grafted batch)
    let readyBatch = await db('batches').where({ serial_number: 'RFS-2026-00001' }).first();
    if (!readyBatch) {
      const [id] = await db('batches').insert({
        batch_type: 'READY_FOR_SALE',
        serial_number: 'RFS-2026-00001',
        plant_variety: 'Gir Kesar Mango (Certified 1-Year Graft)',
        status: 'READY',
        initial_quantity: 200,
        current_quantity: 180, // 20 sold in sample order
        location: 'Dispatch Yard Row 1',
        notes: 'Hardened, healthy vigorous growth ready for orchard planting.',
      }).returning('id');
      const bId = typeof id === 'object' ? id.id : id;
      readyBatch = { id: bId };

      await db('identifiers').insert({
        entity_type: 'BATCH',
        entity_id: bId,
        scheme: 'SERIAL',
        value: 'RFS-2026-00001',
        status: 'ACTIVE',
      });
      await db('sequences').insert({ name: 'RFS_2026', current_val: 1, updated_at: db.fn.now() }).onConflict('name').merge();

      // Lineage connection
      await db('batch_lineage').insert({
        batch_id: bId,
        parent_batch_id: graftedBatch.id,
        relationship_type: 'PROMOTED_FROM',
        notes: '200 vigorous plants promoted from GR-2026-00001 to Ready for Sale',
      });

      await db('inventory_movements').insert([
        {
          batch_id: bId,
          movement_type: 'READY_PROMOTION',
          quantity_change: 200,
          resulting_balance: 200,
          reference_type: 'BATCH_PROMOTION',
          notes: 'Promoted to Ready for Sale stock',
        },
        {
          batch_id: bId,
          movement_type: 'SALE_DEDUCTION',
          quantity_change: -20,
          resulting_balance: 180,
          reference_type: 'ORDER',
          reference_id: 'SALE-2026-00001',
          notes: 'Deducted for invoice SALE-2026-00001',
        },
      ]);
    }

    // H. Catalogue Products
    const mangoCategory = await db('categories').where({ slug: 'grafted-mango' }).first();
    const guavaCategory = await db('categories').where({ slug: 'guava-hybrids' }).first();

    const sampleProducts = [
      {
        name: `Gir Kesar Mango Grafted Sapling${isDevMarker}`,
        slug: 'gir-kesar-mango-grafted-sapling',
        category_id: mangoCategory ? mangoCategory.id : null,
        short_description: 'Certified saffron-colored sweet pulp cultivar on vigorous polyembryonic rootstock.',
        full_description: 'Our Gir Kesar mango plants are propagated exclusively from authenticated, virus-indexed 18-year-old mother trees. They boast superior acclimatization, early bearing within 3 years, and exceptional drought tolerance.',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1591084728795-1149f32d9866?auto=format&fit=crop&w=800&q=80',
        ]),
        price: 180.0,
        is_price_on_request: false,
        is_featured: true,
        is_published: true,
        is_archived: false,
        specs: JSON.stringify({
          'Grafting Technique': 'Wedge / Cleft Grafting',
          'Rootstock Age': '9 Months',
          'Acclimatization': '30 Days Hardened',
          'Recommended Spacing': '5m x 5m (High Density: 3m x 2m)',
          'Expected Bearing': '24 - 36 Months',
        }),
        display_order: 1,
      },
      {
        name: `Taiwan Pink Guava High-Density Graft${isDevMarker}`,
        slug: 'taiwan-pink-guava-high-density-graft',
        category_id: guavaCategory ? guavaCategory.id : null,
        short_description: 'Crisp aromatic pink flesh, minimal seed cavity, resistant to guava wilt.',
        full_description: 'Optimized for commercial meadow orchard planting. Yields uniform 350g-450g fruits with rich natural sugars and extended shelf-life.',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?auto=format&fit=crop&w=800&q=80',
        ]),
        price: 140.0,
        is_price_on_request: false,
        is_featured: true,
        is_published: true,
        is_archived: false,
        specs: JSON.stringify({
          'Rootstock Type': 'Desi Wilt-Resistant Guava',
          'Fruit Weight': '350g - 450g',
          'Planting Density': '2m x 1.5m Meadow System',
        }),
        display_order: 2,
      },
      {
        name: `Commercial Orchard Bulk Graft Allocation${isDevMarker}`,
        slug: 'commercial-orchard-bulk-graft-allocation',
        category_id: mangoCategory ? mangoCategory.id : null,
        short_description: 'Custom contract grafting for 500+ plants with specific variety / rootstock choice.',
        full_description: 'For corporate farms and extensive orchard projects. We sow, graft, and cure according to your planned planting season with certified phytosanitary records.',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
        ]),
        price: null,
        is_price_on_request: true,
        is_featured: true,
        is_published: true,
        is_archived: false,
        specs: JSON.stringify({
          'Minimum Order': '500 Saplings',
          'Lead Time': '4 - 6 Months',
          'Agronomy Support': 'Soil & Layout Consultation Included',
        }),
        display_order: 3,
      },
    ];

    for (const p of sampleProducts) {
      let product = await db('products').where({ slug: p.slug }).first();
      if (!product) {
        const [id] = await db('products').insert({
          ...p,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        }).returning('id');
        product = { id: typeof id === 'object' ? id.id : id };
      }

      // Link Gir Kesar Product to Ready-for-Sale batch RFS-2026-00001
      if (p.slug === 'gir-kesar-mango-grafted-sapling' && readyBatch) {
        const linkExists = await db('product_batch_links')
          .where({ product_id: product.id, batch_id: readyBatch.id })
          .first();
        if (!linkExists) {
          await db('product_batch_links').insert({
            product_id: product.id,
            batch_id: readyBatch.id,
            created_at: db.fn.now(),
          });
          console.log(`[SEED] Linked product "${p.name}" to ready batch RFS-2026-00001`);
        }
      }
    }

    // I. Sample Customer & Order
    let customer = await db('customers').where({ phone: '+91 99887 76655' }).first();
    if (!customer) {
      const [id] = await db('customers').insert({
        name: `Vikramaditya Farms Ltd.${isDevMarker}`,
        phone: '+91 99887 76655',
        email: 'vikram@vikramfarms.local',
        address: 'Plot 7, Agro Industrial Park, Highway Road',
        company_name: 'Vikramaditya Agricultural Holdings',
        gst_or_tax_id: 'GSTIN27ABCDE1234F1Z5',
        created_at: db.fn.now(),
      }).returning('id');
      customer = { id: typeof id === 'object' ? id.id : id };
    }

    let order = await db('orders').where({ invoice_number: 'SALE-2026-00001' }).first();
    if (!order && readyBatch) {
      const [id] = await db('orders').insert({
        invoice_number: 'SALE-2026-00001',
        customer_id: customer.id,
        order_date: '2026-03-10',
        total_amount: 3600.0,
        payment_mode: 'UPI',
        payment_status: 'PAID',
        payment_notes: 'Paid via direct bank UPI transaction ID #UPI889977. Verified.',
        status: 'DELIVERED',
        notes: 'Handover complete. 20 saplings loaded on vehicle MH-12-AB-1234.',
        created_at: db.fn.now(),
      }).returning('id');
      const orderId = typeof id === 'object' ? id.id : id;

      await db('identifiers').insert({
        entity_type: 'ORDER',
        entity_id: orderId,
        scheme: 'SERIAL',
        value: 'SALE-2026-00001',
        status: 'ACTIVE',
      });
      await db('sequences').insert({ name: 'SALE_2026', current_val: 1, updated_at: db.fn.now() }).onConflict('name').merge();

      await db('order_items').insert({
        order_id: orderId,
        batch_id: readyBatch.id,
        quantity: 20,
        unit_price: 180.0,
        total_price: 3600.0,
        notes: 'Gir Kesar Mango 1-year grafted',
      });
    }

    // J. Sample Promotional Banner
    const sampleBanner = await db('cms_banners').where({ title: 'Monsoon 2026 Graft Allocation' }).first();
    if (!sampleBanner) {
      await db('cms_banners').insert({
        title: 'Monsoon 2026 Graft Allocation',
        subtitle: 'Pre-book certified Kesar, Alphonso & Amrapali saplings with pedigree tags.',
        badge_text: 'Advance Booking Open',
        image_url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
        link_url: '/products',
        start_date: '2026-01-01',
        expiry_date: '2026-12-31',
        is_active: true,
        display_order: 1,
        is_archived: false,
        created_at: db.fn.now(),
      });
    }

    // K. Sample Enquiries
    const sampleEnquiry = await db('enquiries').where({ email: 'suresh.patil@orchardgrowers.local' }).first();
    if (!sampleEnquiry) {
      await db('enquiries').insert({
        name: 'Suresh Patil',
        email: 'suresh.patil@orchardgrowers.local',
        phone: '+91 98223 34455',
        subject: 'Enquiry for 350 Kesar Mango Grafts',
        message: 'Looking to plant in late July. Can you confirm rootstock lineage and provide acclimatization certificates?',
        status: 'NEW',
        notes: 'Follow up on WhatsApp.',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    }

    // L. Sample Tasks Assigned by Admin to Supervisor & Worker
    if (await db.schema.hasTable('tasks')) {
      const adminUser = await db('users').where({ role: 'ADMIN' }).first();
      const supUser = await db('users').where({ role: 'SUPERVISOR' }).first();
      const workerUser = await db('users').whereIn('role', ['WORKER', 'USER']).first();

      if (adminUser && supUser) {
        const existingSupTask = await db('tasks').where({ title: 'Audit Curing Chamber 1 Humidity & Temperature' }).first();
        if (!existingSupTask) {
          await db('tasks').insert({
            title: 'Audit Curing Chamber 1 Humidity & Temperature',
            description: 'Verify 85-90% relative humidity is maintained for the newly grafted mango saplings.',
            assigned_to_user_id: supUser.id,
            created_by_user_id: adminUser.id,
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            stage: 'CURING',
            due_date: '2026-03-15',
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      }

      if (adminUser && workerUser) {
        const existingWorkerTask = await db('tasks').where({ title: 'Inspect Tray Bay 3 Sowing Viability' }).first();
        if (!existingWorkerTask) {
          await db('tasks').insert({
            title: 'Inspect Tray Bay 3 Sowing Viability',
            description: 'Check germination sprout health and record any seedling loss or damping off in Tray Bay 3.',
            assigned_to_user_id: workerUser.id,
            created_by_user_id: adminUser.id,
            priority: 'MEDIUM',
            status: 'PENDING',
            stage: 'GROWTH',
            due_date: '2026-03-10',
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      }
    }
  }

  console.log('[SEED] Database seeding complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const isSample = process.argv.includes('--sample') || !process.argv.includes('--real');
  seed(isSample).then(() => {
    console.log('[SEED] Success.');
    process.exit(0);
  }).catch((err) => {
    console.error('[SEED ERROR]', err);
    process.exit(1);
  });
}
