const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all migration files
const getMigrationFiles = () => {
  const migrationsDir = path.join(__dirname, 'migrations');
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => ({
      name: file,
      path: path.join(migrationsDir, file)
    }));
};

// Check if migrations table exists
const checkMigrationsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  }
};

// Get executed migrations
const getExecutedMigrations = async () => {
  try {
    const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  } catch (error) {
    console.error('Error getting executed migrations:', error);
    throw error;
  }
};

// Execute migration
const executeMigration = async (migration) => {
  try {
    console.log(`Executing migration: ${migration.name}`);
    
    const sql = fs.readFileSync(migration.path, 'utf8');
    await pool.query(sql);
    
    // Record migration as executed
    await pool.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      [migration.name]
    );
    
    console.log(`✅ Migration ${migration.name} executed successfully`);
  } catch (error) {
    console.error(`❌ Error executing migration ${migration.name}:`, error);
    throw error;
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Check/create migrations table
    await checkMigrationsTable();
    
    // Get migration files and executed migrations
    const migrationFiles = getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();
    
    // Filter out already executed migrations
    const pendingMigrations = migrationFiles.filter(
      migration => !executedMigrations.includes(migration.name)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
    
    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
