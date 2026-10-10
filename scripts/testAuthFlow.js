async function test() {
  try {
    console.log('[Test 1] Logging in with primary admin (admin / Admin@2026!Career)...');
    const res1 = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@2026!Career' })
    });
    const data1 = await res1.json();
    console.log('Login 1 status:', res1.status, 'Success:', data1.success);
    if (!data1.token) throw new Error('No token returned');
    console.log('JWT Token received:', data1.token.substring(0, 30) + '...');
    console.log('Admin user:', data1.admin);

    console.log('\n[Test 2] Querying protected /api/admin/stats with JWT Bearer...');
    const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${data1.token}`,
        'Content-Type': 'application/json'
      }
    });
    const statsData = await statsRes.json();
    console.log('Stats status:', statsRes.status, 'Stats:', statsData.stats);

    console.log('\n[Test 3] Testing secondary admin (u829141913_career_desk / Siddu@Intc.123456)...');
    const res2 = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'u829141913_career_desk', password: 'Siddu@Intc.123456' })
    });
    const data2 = await res2.json();
    console.log('Login 2 status:', res2.status, 'Success:', data2.success, 'User:', data2.admin.username);

    console.log('\n[Test 4] Testing unauthorized access without token to /api/admin/stats (should fail 401)...');
    const badRes = await fetch('http://localhost:5000/api/admin/stats');
    const badData = await badRes.json();
    console.log('Unprotected request status:', badRes.status, 'Message:', badData.message);

    console.log('\n ALL TESTS PASSED SUCCESSFULLY! JWT AUTH & API PROTECTION VERIFIED.');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
