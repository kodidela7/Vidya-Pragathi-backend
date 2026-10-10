# Vidya Pragathi — Backend API Server

Backend REST API service for Karnataka South-East Constituency Graduate Career & Opportunity Desk.

## Tech Stack
- **Runtime:** Node.js (Express.js)
- **Database:** MySQL
- **Auth:** JWT (JSON Web Tokens) with bcrypt password hashing
- **CORS:** Enabled for frontend integration

## Prerequisites
- Node.js (v18+)
- MySQL (v8.0+)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/kodidela7/Vidya-Pragathi-backend.git
cd Vidya-Pragathi-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure Environment Variables:
Copy `.env.example` to `.env` and fill in your database credentials:
```bash
cp .env.example .env
```

```env
PORT=5000
DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=karnataka_career_desk
JWT_SECRET=your_jwt_secret_key_here
```

4. Initialize Database Tables:
```bash
node scripts/initJobsDb.js
node scripts/checkAndSeedAdmins.js
```

5. Run the Server:
```bash
# Development / Production
npm start
# or
node server.js
```

## API Endpoints

### Public APIs
- `GET /api/jobs` - Paginated job listings with keyword search & district filters
- `GET /api/jobs/:id` - Job details
- `POST /api/graduates/register` - Graduate desk intake registration
- `POST /api/helpdesk/ticket` - Constituency helpdesk grievance intake

### Admin APIs (Protected by JWT)
- `POST /api/auth/login` - Admin authentication
- `GET /api/admin/stats` - Constituency metrics & counters
- `GET /api/admin/graduates` - Paginated registered candidates
- `DELETE /api/admin/graduates/:id` - Remove graduate record
- `GET /api/admin/helpdesk` - Paginated helpdesk tickets with status/district filters
- `PUT /api/admin/helpdesk/:id` - Update ticket resolution status
- `DELETE /api/admin/helpdesk/:id` - Remove ticket record
- `POST /api/admin/jobs` - Post verified career opportunity
- `PUT /api/admin/jobs/:id` - Update opportunity
- `DELETE /api/admin/jobs/:id` - Delete opportunity
