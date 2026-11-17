import { db } from '../../db/connection.js';
import QRCode from 'qrcode';

export interface IdentifierRecord {
  id: number;
  entity_type: string;
  entity_id: number;
  scheme: 'SERIAL' | 'QR' | 'BARCODE';
  value: string;
  status: 'ACTIVE' | 'RETIRED';
  issued_at: string;
  retired_at: string | null;
}

export interface RenderedLabel {
  code: string;
  scheme: 'SERIAL' | 'QR' | 'BARCODE';
  title: string;
  subtitle: string;
  details: Record<string, string | number>;
  qrDataUrl?: string;
  barcodeData?: string;
  printableHtml: string;
}

export interface IdentifierStrategy {
  scheme: 'SERIAL' | 'QR' | 'BARCODE';
  format(prefix: string, year: number, seq: number, template: string): string;
  validate(code: string): boolean;
  generateCode(prefix: string, year: number, seq: number, template: string): string;
}

export class SerialStrategy implements IdentifierStrategy {
  scheme: 'SERIAL' = 'SERIAL';

  format(prefix: string, year: number, seq: number, template: string): string {
    const seqLengthMatch = template.match(/\{SEQ:(\d+)\}/);
    const seqPadding = seqLengthMatch ? parseInt(seqLengthMatch[1], 10) : 5;
    const formattedSeq = String(seq).padStart(seqPadding, '0');

    return template
      .replace('{PREFIX}', prefix)
      .replace('{YYYY}', String(year))
      .replace(/\{SEQ(:\d+)?\}/, formattedSeq);
  }

  generateCode(prefix: string, year: number, seq: number, template: string): string {
    return this.format(prefix, year, seq, template);
  }

  validate(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    // Expected format: e.g. GR-2026-00001, RS-2026-00012, etc.
    const regex = /^[A-Z]{2,6}-\d{4}-\d{3,8}$/;
    return regex.test(code.trim().toUpperCase());
  }
}

export class QrStrategy implements IdentifierStrategy {
  scheme: 'QR' = 'QR';

  format(prefix: string, year: number, seq: number, template: string): string {
    const serial = new SerialStrategy().format(prefix, year, seq, template);
    return `NURCERY://QR/${serial}`;
  }

  generateCode(prefix: string, year: number, seq: number, template: string): string {
    return this.format(prefix, year, seq, template);
  }

  validate(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    return code.startsWith('NURCERY://QR/') || new SerialStrategy().validate(code);
  }
}

export class BarcodeStrategy implements IdentifierStrategy {
  scheme: 'BARCODE' = 'BARCODE';

  format(prefix: string, year: number, seq: number, template: string): string {
    const formattedSeq = String(seq).padStart(6, '0');
    return `BC${prefix}${year}${formattedSeq}`;
  }

  generateCode(prefix: string, year: number, seq: number, template: string): string {
    return this.format(prefix, year, seq, template);
  }

  validate(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    return /^BC[A-Z]{2,6}\d{4}\d{6}$/.test(code.trim());
  }
}

export class IdentifierService {
  private strategies: Map<string, IdentifierStrategy> = new Map();

  constructor() {
    const serial = new SerialStrategy();
    const qr = new QrStrategy();
    const barcode = new BarcodeStrategy();

    this.strategies.set(serial.scheme, serial);
    this.strategies.set(qr.scheme, qr);
    this.strategies.set(barcode.scheme, barcode);
  }

  public getStrategy(scheme: string): IdentifierStrategy {
    const strategy = this.strategies.get(scheme.toUpperCase());
    if (!strategy) {
      return this.strategies.get('SERIAL')!;
    }
    return strategy;
  }

  /**
   * Get active identification mode from database settings
   * Defaults to 'SERIAL'
   */
  public async getActiveScheme(): Promise<'SERIAL' | 'QR' | 'BARCODE'> {
    try {
      const setting = await db('settings').where({ key: 'identifier_active_scheme' }).first();
      if (setting && (setting.value === 'QR' || setting.value === 'BARCODE')) {
        return setting.value;
      }
    } catch {
      // fallback
    }
    return 'SERIAL';
  }

  /**
   * Get template string from settings, e.g. {PREFIX}-{YYYY}-{SEQ:5}
   */
  public async getSerialTemplate(): Promise<string> {
    try {
      const setting = await db('settings').where({ key: 'identifier_serial_template' }).first();
      if (setting?.value) {
        return setting.value;
      }
    } catch {}
    return '{PREFIX}-{YYYY}-{SEQ:5}';
  }

  /**
   * Get prefix mapping for entity type
   */
  public async getPrefixForType(entityType: string): Promise<string> {
    const typeUpper = entityType.toUpperCase();
    const defaults: Record<string, string> = {
      ROOTSTOCK: 'RS',
      SCION: 'SC',
      GRAFTED: 'GR',
      READY_FOR_SALE: 'RFS',
      SEED_LOT: 'SEED',
      ORDER: 'SALE',
      PRODUCT: 'PRD',
    };

    try {
      const setting = await db('settings').where({ key: `identifier_prefix_${typeUpper.toLowerCase()}` }).first();
      if (setting?.value) {
        return setting.value;
      }
    } catch {}

    return defaults[typeUpper] || 'GEN';
  }

  /**
   * Concurrency-safe atomic sequence allocator
   * Uses database transactions to guarantee sequences are never reused or collided.
   */
  public async getNextSequence(sequenceName: string): Promise<number> {
    return await db.transaction(async (trx) => {
      const existing = await trx('sequences').where({ name: sequenceName }).forUpdate().first();

      let nextVal = 1;
      if (existing) {
        nextVal = existing.current_val + 1;
        await trx('sequences').where({ name: sequenceName }).update({
          current_val: nextVal,
          updated_at: db.fn.now(),
        });
      } else {
        await trx('sequences').insert({
          name: sequenceName,
          current_val: nextVal,
          updated_at: db.fn.now(),
        });
      }
      return nextVal;
    });
  }

  /**
   * Generate an identifier for an entity, save to identifiers table, return identifier details.
   */
  public async generate(
    entityType: string,
    entityId: number,
    options?: { customPrefix?: string; preferredScheme?: 'SERIAL' | 'QR' | 'BARCODE' }
  ): Promise<{ id: number; scheme: 'SERIAL' | 'QR' | 'BARCODE'; value: string }> {
    const scheme = options?.preferredScheme || (await this.getActiveScheme());
    const strategy = this.getStrategy(scheme);
    const prefix = options?.customPrefix || (await this.getPrefixForType(entityType));
    const template = await this.getSerialTemplate();
    const year = new Date().getFullYear();

    const sequenceKey = `${prefix}_${year}`;
    const seq = await this.getNextSequence(sequenceKey);

    const code = strategy.generateCode(prefix, year, seq, template);

    // Insert into identifiers table
    const [inserted] = await db('identifiers')
      .insert({
        entity_type: entityType.toUpperCase(),
        entity_id: entityId,
        scheme: scheme,
        value: code,
        status: 'ACTIVE',
        issued_at: db.fn.now(),
      })
      .returning(['id', 'value', 'scheme']);

    const id = inserted ? inserted.id : (await db('identifiers').where({ value: code }).first()).id;

    return {
      id,
      scheme,
      value: code,
    };
  }

  /**
   * Look up any code (active or historical)
   */
  public async lookup(code: string): Promise<IdentifierRecord | null> {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    const record = await db('identifiers').whereRaw('UPPER(value) = ?', [clean]).first();
    return record || null;
  }

  /**
   * Validate code format according to active or any registered strategy
   */
  public validate(code: string): boolean {
    for (const strategy of this.strategies.values()) {
      if (strategy.validate(code)) return true;
    }
    return false;
  }

  /**
   * Render printable label metadata & HTML
   */
  public async renderLabel(code: string, meta?: { variety?: string; batchType?: string; date?: string; quantity?: number }): Promise<RenderedLabel> {
    const record = await this.lookup(code);
    const activeScheme = await this.getActiveScheme();
    const effectiveScheme = record ? record.scheme : activeScheme;

    let qrDataUrl: string | undefined;
    if (effectiveScheme === 'QR' || activeScheme === 'QR' || process.env.ENABLE_QR_PREVIEW === 'true') {
      try {
        qrDataUrl = await QRCode.toDataURL(code, { width: 180, margin: 1 });
      } catch {
        // QR rendering error fallback
      }
    }

    const title = meta?.variety ? `${meta.variety}` : `Batch Tag: ${code}`;
    const subtitle = meta?.batchType ? `Type: ${meta.batchType}` : 'Horticulture Inventory Unit';

    const printableHtml = `
      <div class="nursery-tag" style="border: 2px solid #244930; padding: 12px; width: 320px; font-family: sans-serif; background: #fff; color: #1e3c28;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #468f5c; font-weight: bold;">[SAMPLE DATA] Deep Root Farms</div>
        <div style="font-size: 18px; font-weight: bold; margin: 4px 0;">${title}</div>
        <div style="font-size: 12px; color: #555; margin-bottom: 8px;">${subtitle}</div>
        <div style="border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 4px;">
          <div style="font-size: 14px; font-weight: bold; font-family: monospace; letter-spacing: 1px;">ID: ${code}</div>
          ${meta?.date ? `<div style="font-size: 11px; color: #666;">Date: ${meta.date}</div>` : ''}
          ${meta?.quantity !== undefined ? `<div style="font-size: 11px; color: #666;">Qty: ${meta.quantity} units</div>` : ''}
        </div>
        ${
          qrDataUrl
            ? `<div style="margin-top: 8px; text-align: center;"><img src="${qrDataUrl}" alt="${code}" style="width: 100px; height: 100px;" /></div>`
            : ''
        }
      </div>
    `;

    return {
      code,
      scheme: effectiveScheme,
      title,
      subtitle,
      details: {
        code,
        variety: meta?.variety || 'N/A',
        batchType: meta?.batchType || 'N/A',
        date: meta?.date || new Date().toISOString().split('T')[0],
        quantity: meta?.quantity || 0,
      },
      qrDataUrl,
      printableHtml,
    };
  }
}

export const identifierService = new IdentifierService();
export default identifierService;

