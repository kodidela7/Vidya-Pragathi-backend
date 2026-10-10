import dotenv from 'dotenv';
dotenv.config();

let pool = null;
let dbClientType = process.env.DB_CLIENT || 'mysql';

/**
 * Initialize and get SQL Connection Pool
 */
export async function getPool() {
  if (pool) return pool;

  const client = (process.env.DB_CLIENT || 'mysql').toLowerCase();

  try {
    if (client === 'postgres' || client === 'postgresql' || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'))) {
      const { default: pg } = await import('pg');
      const { Pool } = pg;
      
      const config = process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'karnataka_career_desk',
          };

      pool = new Pool(config);
      dbClientType = 'postgres';
      return pool;
    } else {
      // Default to MySQL
      const mysql = await import('mysql2/promise');

      const config = process.env.DATABASE_URL
        ? { uri: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'karnataka_career_desk',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
          };

      pool = mysql.createPool(config);
      dbClientType = 'mysql';
      return pool;
    }
  } catch (err) {
    console.error('Failed to initialize SQL database pool:', err.message);
    throw err;
  }
}

/**
 * Test Database Connection
 */
export async function testConnection() {
  // Check if credentials are still placeholder
  if (!process.env.DATABASE_URL && (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'your_database_password')) {
    return {
      connected: false,
      message: 'Pending SQL credentials. Please update backend/.env with your SQL database credentials.'
    };
  }

  try {
    const activePool = await getPool();
    if (dbClientType === 'postgres') {
      const res = await activePool.query('SELECT NOW() AS current_time');
      return { connected: true, client: 'postgres', timestamp: res.rows[0].current_time };
    } else {
      const [rows] = await activePool.query('SELECT NOW() AS server_time, 1 AS alive');
      return { connected: true, client: 'mysql', timestamp: rows[0].server_time };
    }
  } catch (error) {
    return {
      connected: false,
      client: dbClientType,
      error: error.message
    };
  }
}

/**
 * Generic query executor
 */
export async function executeQuery(sql, params = []) {
  const activePool = await getPool();
  if (dbClientType === 'postgres') {
    const result = await activePool.query(sql, params);
    return result.rows;
  } else {
    const [rows] = await activePool.execute(sql, params);
    return rows;
  }
}

export default {
  getPool,
  testConnection,
  executeQuery
};
