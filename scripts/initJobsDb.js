import dotenv from 'dotenv';
import { getPool } from '../db/database.js';

dotenv.config();

async function initJobs() {
  try {
    const pool = await getPool();
    console.log('[Jobs Migration] Connected to remote MySQL, creating jobs table...');

    const createJobsTableSql = `
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        job_type VARCHAR(100) NOT NULL DEFAULT 'Full Time',
        district VARCHAR(100) NOT NULL,
        taluk VARCHAR(100) NULL,
        qualification VARCHAR(255) NOT NULL,
        experience VARCHAR(100) DEFAULT 'Freshers',
        passing_year VARCHAR(100) NULL,
        salary VARCHAR(100) NULL,
        openings VARCHAR(50) NULL,
        deadline DATE NOT NULL,
        apply_url VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        skills VARCHAR(255) NULL,
        status ENUM('active', 'draft', 'closed') DEFAULT 'active',
        source_note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_district (district),
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      );
    `;

    await pool.query(createJobsTableSql);
    console.log('[Jobs Migration] `jobs` table created or verified.');

    // Check if jobs table has initial records
    const [existing] = await pool.query('SELECT COUNT(*) AS count FROM jobs');
    if (existing[0].count === 0) {
      console.log('[Jobs Migration] Seeding initial verified opportunities across Karnataka South-East...');

      const sampleJobs = [
        {
          title: 'Graduate Engineer Trainee (GET) - Electronics & Assembly',
          company: 'Wistron Infocomm (Tata Electronics)',
          category: 'Engineering & Tech',
          job_type: 'Full Time',
          district: 'Kolar',
          taluk: 'Narasapura Industrial Area',
          qualification: 'BE / B.Tech (ECE / EEE / Mechanical / Mechatronics)',
          experience: 'Freshers (0-1 yr)',
          passing_year: '2023 - 2026',
          salary: '₹3.8 LPA - ₹4.5 LPA',
          openings: '120 Openings',
          deadline: '2026-11-15',
          apply_url: 'https://careers.tataelectronics.com/campus-kolar',
          description: 'Assembly line operations, SMT production supervision, electronics testing and quality assurance at Narasapura industrial facility.',
          skills: 'SMT Testing, Electronic Hardware, Quality Audits, Kaizen',
          status: 'active',
          source_note: 'Constituency Industrial Placement MoU'
        },
        {
          title: 'Junior Accounts Executive & GST Compliance Analyst',
          company: 'Tumakuru Smart City & Regional Co-operatives',
          category: 'Commerce & Banking',
          job_type: 'Full Time',
          district: 'Tumakuru',
          taluk: 'Tumakuru City',
          qualification: 'B.Com / BBA / M.Com',
          experience: 'Freshers (0-2 yrs)',
          passing_year: '2022 - 2026',
          salary: '₹2.8 LPA - ₹3.4 LPA',
          openings: '45 Openings',
          deadline: '2026-11-20',
          apply_url: 'https://tumakurusmartcity.in/careers',
          description: 'Ledger management, GST return filings, audit reconciliations, and municipal accounts ledger support.',
          skills: 'Tally Prime, GST Filing, Excel Reconciliations, Financial Reporting',
          status: 'active',
          source_note: 'District Industry Centre (DIC) Drive'
        },
        {
          title: 'KPSC Group-C Non-Technical FDA/SDA Coaching Fellow',
          company: 'Karnataka Public Service Support Cell',
          category: 'Government / KPSC Exams',
          job_type: 'Government Notice',
          district: 'Chitradurga',
          taluk: 'Chitradurga HQ & Challakere',
          qualification: 'Any Recognized Degree (BA / B.Sc / B.Com / BE)',
          experience: 'No Prior Experience Required',
          passing_year: 'Any Batch',
          salary: '₹27,650 - ₹52,650 (Govt Scale)',
          openings: '85 State Posts',
          deadline: '2026-11-30',
          apply_url: 'https://kpsc.kar.nic.in',
          description: 'Recruitment notice for First Division Assistants (FDA) and Second Division Assistants (SDA) in regional commissioner offices.',
          skills: 'General Kannada, Constitution of India, General Knowledge, Aptitude',
          status: 'active',
          source_note: 'Official KPSC Employment Gazette'
        },
        {
          title: 'KDEM Emerging Tech Apprentice (AI & Data Annotation)',
          company: 'Karnataka Digital Economy Mission (KDEM)',
          category: 'Emerging AI & Digital Skills',
          job_type: 'Internship / Apprenticeship',
          district: 'Chikkaballapur',
          taluk: 'Chikkaballapur Tech Park Campus',
          qualification: 'B.Sc (CS/IT), BCA, BE / B.Tech (Any Stream)',
          experience: 'Freshers',
          passing_year: '2024 - 2026',
          salary: '₹20,000 / month Stipend',
          openings: '60 Internships',
          deadline: '2026-11-10',
          apply_url: 'https://kdem.karnataka.gov.in/skill-accelerator',
          description: 'Govt-sponsored 6-month skill development apprenticeship on Generative AI data workflows, machine learning labeling, and cloud foundations.',
          skills: 'Python Foundations, Data Annotation, Prompt Engineering, Cloud Basics',
          status: 'active',
          source_note: 'KDEM Beyond Bengaluru Initiative'
        },
        {
          title: 'Textile Operations Quality Inspector & Production Associate',
          company: 'Shahi Exports / Arvind Mills Hub',
          category: 'Engineering & Tech',
          job_type: 'Full Time',
          district: 'Davanagere',
          taluk: 'Harihar Industrial Hub',
          qualification: 'Diploma / Degree in Textile Tech, Mechanical, or Any Science Graduate',
          experience: 'Freshers (0-1 yr)',
          passing_year: '2022 - 2026',
          salary: '₹2.6 LPA - ₹3.2 LPA',
          openings: '80 Openings',
          deadline: '2026-11-25',
          apply_url: 'https://davanagere-jobs.karnataka.gov.in',
          description: 'Garment and textile fabric quality evaluation, production workflow tracking, and dispatch standards verification.',
          skills: 'Quality Inspection, Fabric Analysis, Production Tracking, Lean 5S',
          status: 'active',
          source_note: 'Davanagere District Placement Cell'
        },
        {
          title: 'Automotive Design & CNC Machinist Trainee',
          company: 'Toyota Boshoku Automotive / Vasanthanarasapura Hub',
          category: 'Engineering & Tech',
          job_type: 'Full Time',
          district: 'Tumakuru',
          taluk: 'Vasanthanarasapura Phase-2',
          qualification: 'BE (Mechanical / Automobile / Production) or Diploma',
          experience: 'Freshers (0-1 yr)',
          passing_year: '2023 - 2026',
          salary: '₹3.6 LPA - ₹4.2 LPA',
          openings: '50 Openings',
          deadline: '2026-12-05',
          apply_url: 'https://toyota-boshoku.co.in/careers',
          description: 'Automotive seating and interior components precision machining, CNC tool programming, and CAD draft review.',
          skills: 'AutoCAD, SolidWorks, CNC Operation, Machine Tolerancing',
          status: 'active',
          source_note: 'Tumakuru Industrial Area Placement Cell'
        },
        {
          title: 'Junior Pharmacist & Clinical Lab Technician',
          company: 'District Health Society & MedPlus Regional',
          category: 'Healthcare & Allied',
          job_type: 'Full Time',
          district: 'Kolar',
          taluk: 'Kolar District Hospital Campus',
          qualification: 'B.Pharm / D.Pharm / B.Sc MLT',
          experience: 'Freshers (0-1 yr)',
          passing_year: '2022 - 2026',
          salary: '₹2.5 LPA - ₹3.2 LPA',
          openings: '30 Openings',
          deadline: '2026-11-18',
          apply_url: 'https://kolar.nic.in/health-recruitment',
          description: 'Dispensing medicines, patient inventory tracking, pharmaceutical documentation, and lab sample cataloging.',
          skills: 'Pharmacology, Drug Inventory, Patient Counseling, Lab Safety',
          status: 'active',
          source_note: 'District Health Directorate'
        },
        {
          title: 'Graduate Agri-Business Field Coordinator',
          company: 'Karnataka State Mango Development & Agri Board',
          category: 'Commerce & Banking',
          job_type: 'Contractual',
          district: 'Chikkaballapur',
          taluk: 'Sidlaghatta & Chintamani',
          qualification: 'B.Sc Agriculture / B.Sc Horticulture / B.Com / BBA',
          experience: 'Freshers (0-1 yr)',
          passing_year: '2023 - 2026',
          salary: '₹2.8 LPA + Field Allowances',
          openings: '25 Openings',
          deadline: '2026-11-28',
          apply_url: 'https://agri.karnataka.gov.in',
          description: 'Horticulture farmer producer organization (FPO) supply chain coordination, export batch documentation, and cold storage logistics.',
          skills: 'FPO Management, Agri Supply Chain, Farmer Outreach, Kannada Fluency',
          status: 'active',
          source_note: 'State Agri Marketing Board'
        },
        {
          title: 'Junior Network Administrator & IT Support Executive',
          company: 'Datacenter Infotech & BPO Hub',
          category: 'Engineering & Tech',
          job_type: 'Full Time',
          district: 'Davanagere',
          taluk: 'Vidyanagara Campus',
          qualification: 'BCA / B.Sc (IT) / BE (CSE/ISE)',
          experience: 'Freshers (0-1 yr)',
          passing_year: '2023 - 2026',
          salary: '₹3.2 LPA - ₹3.8 LPA',
          openings: '35 Openings',
          deadline: '2026-12-10',
          apply_url: 'https://davanagere-tech.in/jobs',
          description: 'LAN/WAN routing, desktop troubleshooting, firewall configurations, and server backup operations.',
          skills: 'CCNA Basics, Linux, Windows Server, Networking, TCP/IP',
          status: 'active',
          source_note: 'Central Placement Desk'
        },
        {
          title: 'Assistant Panchayat Development Officer (PDO) Exam Fellow',
          company: 'Rural Development & Panchayat Raj Dept (RDPR)',
          category: 'Government / KPSC Exams',
          job_type: 'Government Notice',
          district: 'Tumakuru',
          taluk: 'All Taluks (Gubbi, Kunigal, Tiptur, Sira)',
          qualification: 'Any Degree Recognized by University',
          experience: 'No Experience Required',
          passing_year: 'Any Batch',
          salary: '₹37,900 - ₹70,850 (Govt Scale)',
          openings: '110 Vacancies',
          deadline: '2026-12-15',
          apply_url: 'https://rdpr.karnataka.gov.in',
          description: 'Competitive exam orientation for upcoming Gram Panchayat administration, rural scheme implementation, and e-swathu digital governance.',
          skills: 'Karnataka Panchayat Raj Act, Rural Governance, General Kannada, General Studies',
          status: 'active',
          source_note: 'RDPR Notification'
        },
        {
          title: 'Full Stack Web & Mobile App Intern',
          company: 'StartUp Karnataka Innovation Hub',
          category: 'Emerging AI & Digital Skills',
          job_type: 'Internship / Apprenticeship',
          district: 'Chitradurga',
          taluk: 'Kelagote IT Incubation Center',
          qualification: 'BCA / MCA / B.Sc (CS) / BE (CSE)',
          experience: 'Freshers',
          passing_year: '2024 - 2026',
          salary: '₹18,000 / month Stipend',
          openings: '20 Internships',
          deadline: '2026-11-22',
          apply_url: 'https://startup.karnataka.gov.in/internships',
          description: 'Developing React frontend apps, Node.js REST APIs, and Flutter mobile apps under startup mentorship.',
          skills: 'JavaScript, React, Node.js, REST APIs, Git',
          status: 'active',
          source_note: 'Karnataka Innovation & Technology Society'
        },
        {
          title: 'Branch Operations Officer & Customer Service Associate',
          company: 'Karnataka Gramin Bank (KGB)',
          category: 'Commerce & Banking',
          job_type: 'Full Time',
          district: 'Kolar',
          taluk: 'Kolar, Bangarpet & Malur Branches',
          qualification: 'Any Graduate with Minimum 50% Marks',
          experience: 'Freshers (0-1 yr)',
          passing_year: '2022 - 2026',
          salary: '₹3.5 LPA + Bank Benefits',
          openings: '40 Openings',
          deadline: '2026-12-01',
          apply_url: 'https://karnatakagraminbank.com/recruitment',
          description: 'Customer on-boarding, retail banking operations, KYC verification, and digital payment assistance for rural and semi-urban customers.',
          skills: 'Banking Operations, KYC Compliance, Customer Relations, Kannada Communication',
          status: 'active',
          source_note: 'Regional Rural Banking Drive'
        }
      ];

      for (const job of sampleJobs) {
        await pool.query(
          `INSERT INTO jobs (title, company, category, job_type, district, taluk, qualification, experience, passing_year, salary, openings, deadline, apply_url, description, skills, status, source_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            job.title, job.company, job.category, job.job_type, job.district, job.taluk,
            job.qualification, job.experience, job.passing_year, job.salary, job.openings,
            job.deadline, job.apply_url, job.description, job.skills, job.status, job.source_note
          ]
        );
      }
      console.log(`[Jobs Migration] Seeded ${sampleJobs.length} realistic career opportunities.`);
    } else {
      console.log(`[Jobs Migration] Table already contains ${existing[0].count} jobs.`);
    }

    console.log('[Jobs Migration] Completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Jobs Migration Error]:', err);
    process.exit(1);
  }
}

initJobs();
