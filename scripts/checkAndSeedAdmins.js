import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { getPool } from '../db/database.js';

dotenv.config();

async function run() {
  try {
    const pool = await getPool();
    console.log('[Admins] Checking existing admins in table...');
    const [rows] = await pool.query('SELECT id, username, email, full_name, role, status FROM admins');
    console.log('Current admins:', rows);

    // Also add u829141913_career_desk in case user intended that as admin login
    const username2 = 'u829141913_career_desk';
    const [exists] = await pool.query('SELECT id FROM admins WHERE username = ?', [username2]);
    if (exists.length === 0) {
      const hash = await bcrypt.hash('Siddu@Intc.123456', 10);
      await pool.query(
        `INSERT INTO admins (username, email, password_hash, full_name, role, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [username2, 'desk@vidyapragathi.org', hash, 'Constituency Desk Manager', 'super_admin']
      );
      console.log(`[Admins] Inserted secondary admin '${username2}'`);
    } else {
      console.log(`[Admins] Admin '${username2}' already exists`);
    }

    // Also ensure admin with Admin@2026!Career exists
    const [exists1] = await pool.query('SELECT id FROM admins WHERE username = "admin"');
    if (exists1.length === 0) {
      const hash1 = await bcrypt.hash('Admin@2026!Career', 10);
      await pool.query(
        `INSERT INTO admins (username, email, password_hash, full_name, role, status)
         VALUES ('admin', 'admin@vidyapragathi.org', ?, 'Chief Constituency Officer', 'super_admin', 'active')`,
        [hash1]
      );
      console.log("[Admins] Inserted primary admin 'admin'");
    }

    const [all] = await pool.query('SELECT id, username, email, full_name, role, status FROM admins');
    console.log('[Admins] Final admin list:', all);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
