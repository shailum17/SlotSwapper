// Test script for debugging swap creation
// Run with: node test-swap-creation.js

const https = require('https');

const BASE_URL = 'https://slot-swapper-487q.vercel.app';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testSwapCreation() {
  console.log('🧪 Testing Swap Creation Process\n');
  
  try {
    // Step 1: Test basic connectivity
    console.log('1️⃣ Testing basic connectivity...');
    const health = await makeRequest(`${BASE_URL}/health`);
    console.log(`   Health check: ${health.status} - ${health.data.status}`);
    
    // Step 2: Test routes
    console.log('\n2️⃣ Testing available routes...');
    const routes = await makeRequest(`${BASE_URL}/api/routes`);
    console.log(`   Routes endpoint: ${routes.status}`);
    
    // Step 3: Test POST without auth
    console.log('\n3️⃣ Testing POST endpoint without auth...');
    const testPost = await makeRequest(`${BASE_URL}/api/test-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    console.log(`   Test POST: ${testPost.status} - ${testPost.data.message}`);
    
    // Step 4: Test ObjectId validation
    console.log('\n4️⃣ Testing ObjectId validation...');
    const validationTest = await makeRequest(`${BASE_URL}/api/debug/validate-ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetEventId: '507f1f77bcf86cd799439011',
        requesterEventId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013'
      })
    });
    console.log(`   ObjectId validation: ${validationTest.status}`);
    if (validationTest.data.validation) {
      console.log(`   All IDs valid: ${validationTest.data.allValid}`);
    }
    
    // Step 5: Test swap creation without auth (should get 401)
    console.log('\n5️⃣ Testing swap creation without auth...');
    const swapNoAuth = await makeRequest(`${BASE_URL}/swap/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetEventId: '507f1f77bcf86cd799439011',
        requesterEventId: '507f1f77bcf86cd799439012',
        message: 'Test swap'
      })
    });
    console.log(`   Swap without auth: ${swapNoAuth.status} - ${swapNoAuth.data.message}`);
    
    // Step 6: Instructions for authenticated testing
    console.log('\n6️⃣ For authenticated testing:');
    console.log('   1. Login to get a token');
    console.log('   2. Use the token to test: /api/debug/events');
    console.log('   3. Get real event IDs from your events');
    console.log('   4. Test swap creation with real IDs');
    
    console.log('\n📋 Test Results Summary:');
    console.log(`   ✅ Health: ${health.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Routes: ${routes.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ POST: ${testPost.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ ObjectId: ${validationTest.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Swap endpoint exists: ${swapNoAuth.status === 401 ? 'PASS' : 'FAIL'} (401 expected)`);
    
    if (swapNoAuth.status === 404) {
      console.log('\n❌ ISSUE FOUND: Swap endpoint returns 404 - route not found!');
    } else if (swapNoAuth.status === 401) {
      console.log('\n✅ Swap endpoint exists and requires authentication (good!)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Sample authenticated test function
function printAuthenticatedTestInstructions() {
  console.log('\n🔐 Authenticated Test Instructions:');
  console.log('');
  console.log('1. First, login to get a token:');
  console.log(`curl -X POST ${BASE_URL}/auth/login \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"email":"your@email.com","password":"yourpassword"}\'');
  console.log('');
  console.log('2. Use the token to get your events:');
  console.log(`curl -X GET ${BASE_URL}/api/debug/events \\`);
  console.log('  -H "Authorization: Bearer YOUR_TOKEN"');
  console.log('');
  console.log('3. Test swap creation with real IDs:');
  console.log(`curl -X POST ${BASE_URL}/swap/request \\`);
  console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"targetEventId":"REAL_TARGET_ID","requesterEventId":"REAL_REQUESTER_ID"}\'');
}

// Run the tests
testSwapCreation().then(() => {
  printAuthenticatedTestInstructions();
});