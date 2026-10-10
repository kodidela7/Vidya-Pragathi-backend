-- ===================================================================
-- Karnataka South-East Graduates Career & Opportunity Desk
-- Database Schema (Compatible with MySQL and PostgreSQL)
-- ===================================================================

-- 1. Graduate Registrations Table
CREATE TABLE IF NOT EXISTS graduates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    constituency VARCHAR(100) DEFAULT 'Karnataka South-East',
    district VARCHAR(100) NOT NULL,
    highest_qualification VARCHAR(100),
    graduation_year INT,
    employment_status VARCHAR(50), -- e.g., 'Employed', 'Job Seeking', 'Higher Studies'
    areas_of_interest TEXT,        -- Comma separated skills or tags
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Verified Opportunities Table (Jobs, Internships, Notices)
CREATE TABLE IF NOT EXISTS opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_kn VARCHAR(255),
    organization VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Job', 'Internship', 'Recruitment Notice', 'Fellowship'
    location VARCHAR(100),
    eligibility TEXT,
    deadline DATE,
    source_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Scholarships & Competitive Exams Resources
CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_kn VARCHAR(255),
    category VARCHAR(50) NOT NULL, -- 'Scholarship', 'KPSC', 'Competitive Exam', 'Digital Skills'
    description TEXT,
    eligibility_criteria TEXT,
    application_link VARCHAR(500),
    deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Workshops & Career Guidance Events
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_kn VARCHAR(255),
    event_date DATETIME NOT NULL,
    venue VARCHAR(255) NOT NULL,
    mode VARCHAR(50) DEFAULT 'Hybrid', -- 'In-Person', 'Online', 'Hybrid'
    speaker VARCHAR(150),
    registration_link VARCHAR(500),
    seats_available INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Helpdesk & Assistance Requests
CREATE TABLE IF NOT EXISTS helpdesk_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    query_category VARCHAR(100) NOT NULL, -- 'Career Guidance', 'Exam Help', 'Portal Query', 'Other'
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Open',    -- 'Open', 'In Progress', 'Resolved'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
