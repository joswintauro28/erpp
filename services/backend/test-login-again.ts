import axios from 'axios';

const email = 'test-1781961866558@email.com';
const password = 'password';

async function main() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    });
    console.log('Login again Res:', loginRes.data);
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

main();
