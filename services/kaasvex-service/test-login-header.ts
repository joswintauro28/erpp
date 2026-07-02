import axios from 'axios';

async function testLogin(headerValue: string | undefined, authHeaderValue?: string) {
  try {
    const headers: any = {};
    if (headerValue) {
      headers['x-tenant-id'] = headerValue;
    }
    if (authHeaderValue) {
      headers['Authorization'] = authHeaderValue;
    }
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'persist@test.com',
      password: 'password'
    }, { headers });
    console.log(`[x-tenant-id: ${headerValue}, Auth: ${authHeaderValue ? 'present' : 'absent'}] Login Success:`, loginRes.data.message);
  } catch (err: any) {
    console.error(`[x-tenant-id: ${headerValue}, Auth: ${authHeaderValue ? 'present' : 'absent'}] Login Error:`, err.response?.status, err.response?.data || err.message);
  }
}

async function run() {
  // Test 1: No header
  await testLogin(undefined);

  // Test 2: Valid but mismatched tenant ID (Acme Corp ID)
  await testLogin('cmq48kc170008io4r3ntgycnu');

  // Test 3: Invalid structure / format tenant ID
  await testLogin('invalid-format!@#');

  // Test 4: Stale/non-existent tenant ID (well-formed CUID format but not in DB)
  await testLogin('cmqme34tp000vdo866i98yvxx');

  // Test 5: Invalid/stale Authorization token
  await testLogin(undefined, 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidtokenhere');
}

run();
