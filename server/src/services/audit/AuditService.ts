import { db } from '../../db/connection.js';

export interface AuditLogEntry {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  public static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db('audit_logs').insert({
        user_id: entry.userId || null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ? String(entry.entityId) : null,
        old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        created_at: db.fn.now(),
      });
    } catch (err) {
      console.error('[AUDIT LOG ERROR]', err);
    }
  }
}

