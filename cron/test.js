const axios = require('axios');

async function testNotifyDjangoServer() {
  const user_ids = ['686d7e14d894c0938087669d']; // Example user IDs

  try {
    const response = await axios.post('http://localhost:8080/api/resumes/notify/', { user_ids });
    console.dir(response.data, { depth: null });
  } catch (err) {
    console.error('Failed to notify Django server:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
  }
}

testNotifyDjangoServer();