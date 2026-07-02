import axios from 'axios';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXE0OGtjMTMwMDA3aW80cnd4OHRrMDkyIiwiaWF0IjoxNzgxMTEzMjMxLCJleHAiOjE3ODE3MTgwMzF9.VJTyH4dBoYN8j_eV2FNPB0zeLkdnmlmztwqwBbWJRK8';
const tenantId = 'cmq48kc170008io4r3ntgycnu';

async function main() {
  try {
    const res = await axios.post(
      'http://localhost:5000/api/leads',
      {
        companyName: 'Tech Solutions Ltd',
        contactPerson: 'Jonas Williams',
        email: 'jonas@email.com',
        phone: '+1 (555) 324-1234',
        status: 'Qualified',
        leadScore: 30,
        assignedTo: 'Sarah Johnson',
        source: 'Cold Call'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      }
    );
    console.log('SUCCESS:', res.data);
  } catch (err: any) {
    console.error('ERROR RESPONSE STATUS:', err.response?.status);
    console.error('ERROR RESPONSE DATA:', err.response?.data);
    console.error('ERROR MESSAGE:', err.message);
  }
}

main();
