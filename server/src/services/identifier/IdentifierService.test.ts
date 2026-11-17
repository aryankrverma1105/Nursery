import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db/connection.js';
import { up as runMigrations } from '../../db/migrate.js';
import {
  IdentifierService,
  SerialStrategy,
  QrStrategy,
  BarcodeStrategy,
} from './IdentifierService.js';

describe('IdentifierService & Pluggable Strategies', () => {
  let service: IdentifierService;

  beforeAll(async () => {
    // Run migrations on test database
    await runMigrations();
    service = new IdentifierService();
  });

  describe('SerialStrategy', () => {
    const strategy = new SerialStrategy();

    it('should format code according to template and padding', () => {
      const code = strategy.format('GR', 2026, 42, '{PREFIX}-{YYYY}-{SEQ:5}');
      expect(code).toBe('GR-2026-00042');
    });

    it('should format code with different prefixes', () => {
      expect(strategy.format('RS', 2026, 1, '{PREFIX}-{YYYY}-{SEQ:5}')).toBe('RS-2026-00001');
      expect(strategy.format('SC', 2026, 999, '{PREFIX}-{YYYY}-{SEQ:5}')).toBe('SC-2026-00999');
      expect(strategy.format('SEED', 2026, 5, '{PREFIX}-{YYYY}-{SEQ:5}')).toBe('SEED-2026-00005');
      expect(strategy.format('SALE', 2026, 1234, '{PREFIX}-{YYYY}-{SEQ:5}')).toBe('SALE-2026-01234');
    });

    it('should validate valid serial formats', () => {
      expect(strategy.validate('GR-2026-00001')).toBe(true);
      expect(strategy.validate('RS-2026-00123')).toBe(true);
      expect(strategy.validate('SC-2026-99999')).toBe(true);
      expect(strategy.validate('SEED-2026-00001')).toBe(true);
      expect(strategy.validate('RFS-2026-00001')).toBe(true);
    });

    it('should reject invalid serial formats', () => {
      expect(strategy.validate('INVALID')).toBe(false);
      expect(strategy.validate('GR-26-1')).toBe(false);
      expect(strategy.validate('')).toBe(false);
      expect(strategy.validate('12345')).toBe(false);
    });
  });

  describe('QrStrategy & BarcodeStrategy (Pluggable, Working)', () => {
    it('QrStrategy should format and validate correctly', () => {
      const qr = new QrStrategy();
      const code = qr.format('GR', 2026, 5, '{PREFIX}-{YYYY}-{SEQ:5}');
      expect(code).toBe('NURCERY://QR/GR-2026-00005');
      expect(qr.validate(code)).toBe(true);
      expect(qr.validate('GR-2026-00005')).toBe(true);
      expect(qr.validate('random-string')).toBe(false);
    });

    it('BarcodeStrategy should format and validate Code128 format', () => {
      const barcode = new BarcodeStrategy();
      const code = barcode.format('GR', 2026, 7, '{PREFIX}-{YYYY}-{SEQ:5}');
      expect(code).toBe('BCGR2026000007');
      expect(barcode.validate(code)).toBe(true);
      expect(barcode.validate('invalid')).toBe(false);
    });
  });

  describe('IdentifierService Database Operations', () => {
    it('should allocate concurrency-safe monotonic sequences', async () => {
      const seq1 = await service.getNextSequence('TEST_CONCURRENCY');
      const seq2 = await service.getNextSequence('TEST_CONCURRENCY');
      const seq3 = await service.getNextSequence('TEST_CONCURRENCY');

      expect(seq2).toBe(seq1 + 1);
      expect(seq3).toBe(seq2 + 1);
    });

    it('should generate a persistent identifier and insert into identifiers table', async () => {
      const result = await service.generate('GRAFTED', 9999);
      expect(result.id).toBeDefined();
      expect(result.scheme).toBe('SERIAL');
      expect(result.value).toMatch(/^GR-\d{4}-\d{5}$/);

      // Verify row in database
      const row = await db('identifiers').where({ value: result.value }).first();
      expect(row).toBeDefined();
      expect(row.entity_type).toBe('GRAFTED');
      expect(row.entity_id).toBe(9999);
      expect(row.status).toBe('ACTIVE');
    });

    it('should lookup existing identifiers by code', async () => {
      const gen = await service.generate('ROOTSTOCK', 8888);
      const found = await service.lookup(gen.value);

      expect(found).not.toBeNull();
      expect(found?.entity_type).toBe('ROOTSTOCK');
      expect(found?.entity_id).toBe(8888);
      expect(found?.value).toBe(gen.value);
    });

    it('should render printable label data', async () => {
      const gen = await service.generate('READY_FOR_SALE', 7777);
      const label = await service.renderLabel(gen.value, {
        variety: 'Kesar Mango Graft',
        batchType: 'READY_FOR_SALE',
        quantity: 50,
      });

      expect(label.code).toBe(gen.value);
      expect(label.title).toBe('Kesar Mango Graft');
      expect(label.printableHtml).toContain(gen.value);
      expect(label.printableHtml).toContain('Kesar Mango Graft');
    });
  });
});

