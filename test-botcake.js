import https from 'https';

const testEndpoint = (headers) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'botcake.io',
      path: '/api/v1/pages/123/subscribers/123',
      method: 'GET',
      headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
};

async function runTests() {
  console.log('Test 1: No auth');
  console.log(await testEndpoint({}));
  
  console.log('\nTest 2: Bearer auth');
  console.log(await testEndpoint({ 'Authorization': 'Bearer dummy_key' }));
  
  console.log('\nTest 3: Token auth');
  console.log(await testEndpoint({ 'Authorization': 'Token dummy_key' }));
  
  console.log('\nTest 4: X-Api-Key auth');
  console.log(await testEndpoint({ 'X-Api-Key': 'dummy_key' }));
}

runTests();
