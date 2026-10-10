import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { getPool, executeQuery } from '../db/database.js';

dotenv.config();

async function init() {
  console.log('🔄 Connecting to MySQL Database at', process.env.DB_HOST, '...');

  try {
    const pool = await getPool();

    // 1. Create Admins Table
    console.log('📦 Creating admins table if not exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) DEFAULT 'System Administrator',
        role VARCHAR(50) DEFAULT 'super_admin',
        status VARCHAR(20) DEFAULT 'active',
        last_login DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create Career Desk Graduates Registration Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS graduates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token_id VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(150) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(255) NULL,
        district VARCHAR(100) NOT NULL,
        taluk VARCHAR(100) NULL,
        education VARCHAR(100) NOT NULL,
        stream VARCHAR(100) NULL,
        passout_year INT NULL,
        career_interest VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create Campaign Pledge Votes Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vote_pledges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        district VARCHAR(100) NOT NULL,
        taluk VARCHAR(100) NULL,
        support_note TEXT NULL,
        volunteer_opt_in BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Create Helpdesk Inquiries Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS helpdesk_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(150) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        category VARCHAR(100) NOT NULL,
        district VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tables created/verified successfully.');

    // 5. Inject / Seed Admin Credentials
    const defaultUsername = 'admin';
    const defaultEmail = 'admin@vidyapragathi.org';
    const rawPassword = 'Admin@2026!Career';

    const [existing] = await pool.query(
      'SELECT id, username, email FROM admins WHERE username = ? OR email = ?',
      [defaultUsername, defaultEmail]
    );

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    if (existing && existing.length > 0) {
      console.log('ℹ️ Admin user already exists. Updating password hash to ensure valid credentials...');
      await pool.query(
        'UPDATE admins SET password_hash = ?, status = "active" WHERE id = ?',
        [passwordHash, existing[0].id]
      );
      console.log(`✅ Admin updated: Username: "${defaultUsername}", Password: "${rawPassword}"`);
    } else {
      console.log('🌱 Injecting initial admin user...');
      await pool.query(
        `INSERT INTO admins (username, email, password_hash, full_name, role, status) 
         VALUES (?, ?, ?, 'Chief Desk Administrator', 'super_admin', 'active')`,
        [defaultUsername, defaultEmail, passwordHash]
      );
      console.log(`✅ Initial Admin Injected:
         Username: "${defaultUsername}"
         Email:    "${defaultEmail}"
         Password: "${rawPassword}"
         Role:     "super_admin"`);
    }

    console.log('\n🎉 Database initialization and admin seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
  }
}

init();
