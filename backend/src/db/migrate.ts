import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  console.log('Running database migrations...');

  try {
    // Read and execute migration file
    const migrationPath = join(__dirname, 'migrations', '001_create_threads.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration: 001_create_threads.sql');
    await query(migrationSQL);

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runMigrations();

