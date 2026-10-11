import dotenv from 'dotenv';
import { getPool } from '../db/database.js';

dotenv.config();

async function initEvents() {
  try {
    const pool = await getPool();
    console.log('[Events Migration] Connected to remote MySQL, creating `events` and `event_registrations` tables...');

    // 1. Create events table
    const createEventsTableSql = `
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        title_kn VARCHAR(255) NULL,
        event_type ENUM('Mega Job Mela', 'Skill Bootcamp', 'Campus Placement Drive', 'Career Masterclass') NOT NULL DEFAULT 'Mega Job Mela',
        district VARCHAR(100) NOT NULL,
        venue VARCHAR(255) NOT NULL,
        venue_kn VARCHAR(255) NULL,
        event_date DATE NOT NULL,
        start_time VARCHAR(50) NOT NULL DEFAULT '9:30 AM',
        end_time VARCHAR(50) NULL DEFAULT '5:00 PM',
        companies_count INT DEFAULT 0,
        expected_openings VARCHAR(100) NULL,
        eligibility VARCHAR(255) NOT NULL,
        eligibility_kn VARCHAR(255) NULL,
        batches_eligible VARCHAR(100) NULL,
        description TEXT NOT NULL,
        description_kn TEXT NULL,
        entry_badge VARCHAR(100) DEFAULT '100% Free E-Pass',
        banner_image VARCHAR(500) NULL DEFAULT '/images/candidate-graduates-meet.jpeg',
        is_featured BOOLEAN DEFAULT FALSE,
        status ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_district (district),
        INDEX idx_event_type (event_type),
        INDEX idx_event_date (event_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createEventsTableSql);
    console.log('[Events Migration] `events` table created or verified.');

    // 2. Create event_registrations table
    const createRegistrationsTableSql = `
      CREATE TABLE IF NOT EXISTS event_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pass_token VARCHAR(50) UNIQUE NOT NULL,
        event_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(255) NULL,
        education VARCHAR(100) NOT NULL,
        stream VARCHAR(100) NULL,
        passout_year VARCHAR(10) NOT NULL,
        district VARCHAR(100) NOT NULL,
        employment_status ENUM('Student / Final Year', 'Fresher / Seeking Job', 'Employed / Looking to Switch') DEFAULT 'Fresher / Seeking Job',
        attendance_status ENUM('Registered', 'Attended', 'Shortlisted', 'Absent') DEFAULT 'Registered',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        INDEX idx_event_id (event_id),
        INDEX idx_mobile (mobile),
        INDEX idx_pass_token (pass_token),
        INDEX idx_attendance (attendance_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createRegistrationsTableSql);
    console.log('[Events Migration] `event_registrations` table created or verified.');

    // 3. Seed initial events if empty
    const [existing] = await pool.query('SELECT COUNT(*) AS count FROM events');
    if (existing[0].count === 0) {
      console.log('[Events Migration] Seeding initial Job Melas & Skill Bootcamps...');

      const seedEvents = [
        {
          event_code: 'MELA-2026-KLR-01',
          title: 'Kolar Aerospace & Precision Engineering Hiring Fair',
          title_kn: 'ಕೋಲಾರ ಏರೋಸ್ಪೇಸ್ & ಪ್ರಿಸಿಷನ್ ಇಂಜಿನಿಯರಿಂಗ್ ನೇಮಕಾತಿ ಮೇಳ',
          event_type: 'Mega Job Mela',
          district: 'Kolar',
          venue: 'Government Boys College Grounds, MB Road, Kolar',
          venue_kn: 'ಸರ್ಕಾರಿ ಬಾಲಕರ ಕಾಲೇಜು ಆವರಣ, ಎಂ.ಬಿ ರಸ್ತೆ, ಕೋಲಾರ',
          event_date: '2026-11-18',
          start_time: '9:30 AM',
          end_time: '5:00 PM',
          companies_count: 45,
          expected_openings: '1,200+ Vacancies',
          eligibility: 'BE/B.Tech, Diploma, ITI, B.Sc, BCA',
          eligibility_kn: 'ಬಿಇ, ಡಿಪ್ಲೊಮಾ, ಐಟಿಐ, ಬಿ.ಎಸ್ಸಿ, ಬಿಸಿಎ',
          batches_eligible: '2021 - 2026 Passouts',
          description: 'Over 45 aerospace, defense electronics, and precision automotive manufacturing companies offering on-the-spot interviews and placement offers.',
          description_kn: '45ಕ್ಕೂ ಹೆಚ್ಚು ರಕ್ಷಣಾ, ಏರೋಸ್ಪೇಸ್ ಮತ್ತು ಆಟೋಮೋಟಿವ್ ಕೈಗಾರಿಕಾ ಘಟಕಗಳಿಂದ ಡಿಪ್ಲೊಮಾ ಮತ್ತು ಇಂಜಿನಿಯರಿಂಗ್ ಪದವೀಧರರಿಗೆ ನೇರ ಸಂದರ್ಶನ.',
          entry_badge: '100% Free E-Pass',
          banner_image: '/images/candidate-graduates-meet.jpeg',
          is_featured: true,
          status: 'Upcoming'
        },
        {
          event_code: 'CAMP-2026-TUM-01',
          title: 'Tumakuru AI & Cloud Computing Bootcamp with KDEM',
          title_kn: 'ತುಮಕೂರು ಎಐ ಮತ್ತು ಕ್ಲೌಡ್ ಕಂಪ್ಯೂಟಿಂಗ್ ತರಬೇತಿ ಶಿಬಿರ',
          event_type: 'Skill Bootcamp',
          district: 'Tumakuru',
          venue: 'Siddaganga Institute of Technology Auditorium, Tumakuru',
          venue_kn: 'ಸಿದ್ಧಗಂಗಾ ತಾಂತ್ರಿಕ ಮಹಾವಿದ್ಯಾಲಯ ಆಡಿಟೋರಿಯಂ, ತುಮಕೂರು',
          event_date: '2026-11-25',
          start_time: '10:00 AM',
          end_time: '4:30 PM',
          companies_count: 25,
          expected_openings: 'Free Certifications & Cloud Credits',
          eligibility: 'CS, IT, BCA, MCA, B.Sc, Any Tech Graduate',
          eligibility_kn: 'ಸಿಎಸ್, ಬಿಸಿಎ, ಎಂಸಿಎ, ಬಿ.ಎಸ್ಸಿ, ಬಿಇ',
          batches_eligible: 'Students & 2022-2026 Batches',
          description: 'Hands-on coding, AWS/Azure cloud credits, and interactive sessions on prompt engineering, fullstack architectures, and modern developer workflows.',
          description_kn: 'ಪ್ರಾಯೋಗಿಕ ಕೋಡಿಂಗ್, ಕ್ಲೌಡ್ ಕ್ರೆಡಿಟ್ಸ್ ಮತ್ತು ಪ್ರಾಂಪ್ಟ್ ಇಂಜಿನಿಯರಿಂಗ್ ಕುರಿತು ಉಚಿತ ತಜ್ಞರ ತರಬೇತಿ ಶಿಬಿರ.',
          entry_badge: 'Govt. Certified',
          banner_image: '/images/candidate-graduates-meet.jpeg',
          is_featured: false,
          status: 'Upcoming'
        },
        {
          event_code: 'CONF-2026-CTA-01',
          title: 'Chitradurga Civil Services Masterclass by IAS / KAS Officers',
          title_kn: 'ಚಿತ್ರದುರ್ಗ ಕೆಪಿಎಸ್‌ಸಿ / ನಾಗರಿಕ ಸೇವಾ ಮಾರ್ಗದರ್ಶನ ಕಾರ್ಯಾಗಾರ',
          event_type: 'Career Masterclass',
          district: 'Chitradurga',
          venue: 'Zilla Panchayat Samarthya Soudha, Kelagote, Chitradurga',
          venue_kn: 'ಜಿಲ್ಲಾ ಪಂಚಾಯತ್ ಸಾಮರ್ಥ್ಯ ಸೌಧ, ಕೆಳಗೋಟೆ, ಚಿತ್ರದುರ್ಗ',
          event_date: '2026-12-02',
          start_time: '11:00 AM',
          end_time: '4:00 PM',
          companies_count: 10,
          expected_openings: 'Free KPSC Reference Study Kits',
          eligibility: 'All Degree Graduates (BA, B.Sc, B.Com, BE)',
          eligibility_kn: 'ಎಲ್ಲಾ ಪದವೀಧರರು',
          batches_eligible: 'All Passout Batches',
          description: 'In-depth preparation strategy, syllabus breakdown, mock test walkthrough, and free comprehensive reference kits for state civil service exams.',
          description_kn: 'ಕೆಪಿಎಸ್‌ಸಿ ಪರೀಕ್ಷಾ ಸಿದ್ಧತಾ ತಂತ್ರಗಾರಿಕೆ ಮತ್ತು ಉಚಿತ ಅಧ್ಯಯನ ಸಾಮಗ್ರಿ ವಿತರಣೆಯೊಂದಿಗೆ ಮಾರ್ಗದರ್ಶನ.',
          entry_badge: 'Free Study Kits',
          banner_image: '/images/candidate-graduates-meet.jpeg',
          is_featured: false,
          status: 'Upcoming'
        },
        {
          event_code: 'MELA-2026-DVG-01',
          title: 'Davanagere Mega IT & Industrial Campus Job Mela',
          title_kn: 'ದಾವಣಗೆರೆ ಬೃಹತ್ ಐಟಿ & ಕೈಗಾರಿಕಾ ನೇಮಕಾತಿ ಮೇಳ',
          event_type: 'Mega Job Mela',
          district: 'Davanagere',
          venue: 'Bapuji Institute of Engineering and Technology (BIET) Campus, Davanagere',
          venue_kn: 'ಬಾಪೂಜಿ ಇಂಜಿನಿಯರಿಂಗ್ ಕಾಲೇಜು ಆವರಣ, ದಾವಣಗೆರೆ',
          event_date: '2026-12-12',
          start_time: '9:00 AM',
          end_time: '5:30 PM',
          companies_count: 60,
          expected_openings: '2,000+ Vacancies',
          eligibility: 'Any Degree, B.Com, BBA, B.Sc, BE, Diploma, MBA',
          eligibility_kn: 'ಯಾವುದೇ ಪದವಿ, ಬಿಕಾಂ, ಬಿಬಿಎ, ಬಿಇ, ಡಿಪ್ಲೊಮಾ',
          batches_eligible: '2020 - 2026 Passouts',
          description: 'Premier campus recruitment drive featuring top IT services, BFSI banking, agro-industry, and technical manufacturing conglomerates.',
          description_kn: 'ಪ್ರಮುಖ ಐಟಿ, ಬ್ಯಾಂಕಿಂಗ್ ಮತ್ತು ಉತ್ಪಾದನಾ ವಲಯದ 60ಕ್ಕೂ ಹೆಚ್ಚು ಕಂಪನಿಗಳ ಬೃಹತ್ ನೇಮಕಾತಿ ಮೇಳ.',
          entry_badge: '100% Free E-Pass',
          banner_image: '/images/candidate-graduates-meet.jpeg',
          is_featured: false,
          status: 'Upcoming'
        }
      ];

      for (const ev of seedEvents) {
        await pool.query(
          `INSERT INTO events (
            event_code, title, title_kn, event_type, district, venue, venue_kn,
            event_date, start_time, end_time, companies_count, expected_openings,
            eligibility, eligibility_kn, batches_eligible, description, description_kn,
            entry_badge, banner_image, is_featured, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ev.event_code, ev.title, ev.title_kn, ev.event_type, ev.district, ev.venue, ev.venue_kn,
            ev.event_date, ev.start_time, ev.end_time, ev.companies_count, ev.expected_openings,
            ev.eligibility, ev.eligibility_kn, ev.batches_eligible, ev.description, ev.description_kn,
            ev.entry_badge, ev.banner_image, ev.is_featured, ev.status
          ]
        );
      }
      console.log(`[Events Migration] Seeded ${seedEvents.length} initial Job Melas & Bootcamps successfully.`);
    } else {
      console.log(`[Events Migration] Events table already contains ${existing[0].count} records.`);
    }

    console.log('[Events Migration] Completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Events Migration Error]:', error);
    process.exit(1);
  }
}

initEvents();
