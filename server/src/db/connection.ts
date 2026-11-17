import knex, { Knex } from 'knex';
import { newDb, IMemoryDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbClient = process.env.DB_CLIENT || 'pg-mem';

let knexInstance: Knex;
let memDbInstance: IMemoryDb | null = null;

if (dbClient === 'pg' || dbClient === 'postgresql') {
  knexInstance = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'nurcery_user',
      password: process.env.DB_PASSWORD || 'nurcery_secure_password',
      database: process.env.DB_NAME || 'nurcery_db',
    },
    pool: { min: 2, max: 10 },
  });
} else {
  // Pure JavaScript PostgreSQL engine via pg-mem
  // Zero external dependencies, pure JS, 100% Postgres SQL syntax, functions, sequences and transactions!
  const db = newDb();

  // Register common pg functions
  db.public.registerFunction({
    name: 'version',
    args: [],
    returns: (db.public.getType as any)('text'),
    implementation: () => 'PostgreSQL 16.0 (pg-mem pure JS emulator)',
  });

  db.public.registerFunction({
    name: 'current_timestamp',
    args: [],
    returns: (db.public.getType as any)('timestamp'),
    implementation: () => new Date(),
  });

  memDbInstance = db;
  knexInstance = db.adapters.createKnex();
}

export const db: Knex = knexInstance;
export const memDb: IMemoryDb | null = memDbInstance;
export default db;
