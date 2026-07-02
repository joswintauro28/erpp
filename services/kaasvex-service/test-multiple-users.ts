import axios from 'axios';

const firstEmail = 'test-1781961866558@email.com';
const secondEmail = `test-second-${Date.now()}@email.com`;
const password = 'password';

async function main() {
  try {
    console.log(`Creating second user: ${secondEmail}`);
    const signupRes = await axios.post('http://localhost:5000/api/auth/signup', {
      name: 'Second User',
      email: secondEmail,
      password,
      organizationName: 'Second Org',
      slug: `second-org-${Date.now()}`
    });
    console.log('Second user signup Res:', signupRes.data);
    
    // Now try to log in as the FIRST user
    console.log(`Trying to log in as first user: ${firstEmail}`);
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: firstEmail,
      password
    });
    console.log('First user login Res:', loginRes.data);
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

main();
