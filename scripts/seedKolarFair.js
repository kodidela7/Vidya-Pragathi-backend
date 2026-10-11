import dotenv from 'dotenv';
import { getPool } from '../db/database.js';

dotenv.config();

async function run() {
  try {
    const pool = await getPool();
    const [exists] = await pool.query('SELECT id FROM events WHERE title LIKE ?', ['%Kolar Aerospace%']);
    if (exists.length === 0) {
      await pool.query(`
        INSERT INTO events (
          event_code, title, title_kn, event_type, district, venue, venue_kn,
          event_date, start_time, end_time, companies_count, expected_openings,
          eligibility, eligibility_kn, batches_eligible, description, description_kn,
          entry_badge, banner_image, is_featured, status
        ) VALUES (
          'MELA-2026-KLR-01',
          'Kolar Aerospace & Precision Engineering Hiring Fair',
          'ಕೋಲಾರ ಏರೋಸ್ಪೇಸ್ & ಪ್ರಿಸಿಷನ್ ಇಂಜಿನಿಯರಿಂಗ್ ನೇಮಕಾತಿ ಮೇಳ',
          'Mega Job Mela',
          'Kolar',
          'Government Boys College Grounds, MB Road, Kolar',
          'ಸರ್ಕಾರಿ ಬಾಲಕರ ಕಾಲೇಜು ಆವರಣ, ಎಂ.ಬಿ ರಸ್ತೆ, ಕೋಲಾರ',
          '2026-11-18',
          '9:30 AM',
          '5:00 PM',
          45,
          '1200',
          'BE, Diploma, ITI, B.Sc',
          'ಬಿಇ, ಡಿಪ್ಲೊಮಾ, ಐಟಿಐ, ಬಿ.ಎಸ್ಸಿ',
          '2020 - 2026',
          'Over 45 aerospace, defense electronics, and precision automotive manufacturing companies offering on-the-spot interviews and placement offers.',
          '45ಕ್ಕೂ ಹೆಚ್ಚು ರಕ್ಷಣಾ, ಏರೋಸ್ಪೇಸ್ ಮತ್ತು ಆಟೋಮೋಟಿವ್ ಕೈಗಾರಿಕಾ ಘಟಕಗಳಿಂದ ಡಿಪ್ಲೊಮಾ ಮತ್ತು ಇಂಜಿನಿಯರಿಂಗ್ ಪದವೀಧರರಿಗೆ ನೇರ ಸಂದರ್ಶನ.',
          '100% Free E-Pass',
          '/images/candidate-graduates-meet.jpeg',
          1,
          'Upcoming'
        )
      `);
      console.log('[Seed] Kolar Aerospace Fair inserted successfully as featured event!');
    } else {
      console.log('[Seed] Kolar Aerospace Fair already exists with ID:', exists[0].id);
    }
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

run();
