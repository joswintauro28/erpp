import axios from 'axios';

const email = `test-${Date.now()}@email.com`;
const password = 'password';

async function main() {
  console.log(`Testing with email: ${email}`);
  
  try {
    const signupRes = await axios.post('http://localhost:5000/api/auth/signup', {
      name: 'Test User',
      email,
      password,
      organizationName: 'Test Org',
      slug: `test-org-${Date.now()}`
    });
    console.log('Signup Res:', signupRes.data);
    
    // Attempt Login immediately
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    });
    console.log('Immediate Login Res:', loginRes.data);
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

main();
