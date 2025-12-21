const axios = require('axios');

async function testAPI() {
  try {
    // Test login first
    console.log('Testing login...');
    const loginResponse = await axios.post('http://192.168.0.109:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('Login successful:', loginResponse.data);
    const token = loginResponse.data.token;
    
    // Test active transactions
    console.log('\nTesting active transactions...');
    const transactionsResponse = await axios.get('http://192.168.0.109:3000/api/transactions/active', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Active transactions:', transactionsResponse.data);
    
  } catch (error) {
    console.error('API Test Error:', error.response?.data || error.message);
  }
}

testAPI();