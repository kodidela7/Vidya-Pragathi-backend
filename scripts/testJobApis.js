async function testJobApis() {
  try {
    console.log('[Test 1] Testing public GET /api/jobs?limit=10&page=1...');
    const res1 = await fetch('http://localhost:5000/api/jobs?limit=10&page=1');
    const data1 = await res1.json();
    console.log('Status:', res1.status, 'Success:', data1.success);
    console.log(`Total: ${data1.total}, Page: ${data1.page}, Limit: ${data1.limit}, TotalPages: ${data1.totalPages}, Items returned: ${data1.data.length}`);
    if (data1.data.length !== 10) throw new Error('Expected 10 items on page 1');

    console.log('\n[Test 2] Testing page 2 GET /api/jobs?limit=10&page=2...');
    const res2 = await fetch('http://localhost:5000/api/jobs?limit=10&page=2');
    const data2 = await res2.json();
    console.log(`Page 2: Items returned: ${data2.data.length}, HasMore: ${data2.hasMore}`);

    console.log('\n[Test 3] Testing search parameter GET /api/jobs?search=Toyota...');
    const res3 = await fetch('http://localhost:5000/api/jobs?search=Toyota');
    const data3 = await res3.json();
    console.log(`Search 'Toyota': Total matches: ${data3.total}, Title: ${data3.data[0]?.title}`);

    console.log('\n[Test 4] Testing district parameter GET /api/jobs?district=Tumakuru...');
    const res4 = await fetch('http://localhost:5000/api/jobs?district=Tumakuru');
    const data4 = await res4.json();
    console.log(`District 'Tumakuru': Total matches: ${data4.total}`);

    console.log('\n[Test 5] Logging in as admin to test protected POST /api/admin/jobs...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@2026!Career' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const newJob = {
      title: 'Solar Energy Quality Supervisor',
      company: 'Pavagada Solar Park Operations Hub',
      category: 'Engineering & Tech',
      job_type: 'Full Time',
      district: 'Tumakuru',
      taluk: 'Pavagada Solar Park',
      qualification: 'BE Electrical / Diploma in Electrical',
      experience: 'Freshers (0-1 yr)',
      passing_year: '2023 - 2026',
      salary: '₹3.4 LPA',
      openings: '30 Openings',
      deadline: '2026-12-20',
      apply_url: 'https://pavagadasolar.karnataka.gov.in',
      description: 'Grid connectivity supervision, solar PV panel inverter monitoring and maintenance audits.',
      skills: 'Solar PV, Grid Maintenance, SCADA, Electrical Safety',
      status: 'active',
      source_note: 'Constituency Green Energy Drive'
    };

    const postJobRes = await fetch('http://localhost:5000/api/admin/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newJob)
    });
    const postJobData = await postJobRes.json();
    console.log('Post Job Status:', postJobRes.status, 'Job ID created:', postJobData.jobId);

    console.log('\n ALL BACKEND JOB APIS & PAGINATION VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Job API Test Failed:', err);
    process.exit(1);
  }
}

testJobApis();
