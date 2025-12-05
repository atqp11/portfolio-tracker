/**
 * Test Admin Clear Cache API
 *
 * Demonstrates the authentication requirements for the clear cache endpoint.
 * Run with: npx tsx scripts/test-admin-cache.ts
 */

async function testAdminCacheAPI() {
  console.log('🧪 Testing Admin Clear Cache API...\n');

  const baseUrl = 'http://localhost:3000';

  // Test 1: Unauthenticated request
  console.log('1️⃣ Testing unauthenticated request...');
  try {
    const response = await fetch(`${baseUrl}/api/admin/clear-cache`, {
      method: 'POST',
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${await response.text()}`);
    console.log('   ✅ Expected: Should fail with 401 Unauthorized\n');
  } catch (error) {
    console.log(`   ❌ Error: ${error}\n`);
  }

  // Test 2: Check if server is running
  console.log('2️⃣ Testing server availability...');
  try {
    const response = await fetch(`${baseUrl}`);
    console.log(`   Status: ${response.status}`);
    console.log('   ✅ Server is running\n');
  } catch (error) {
    console.log(`   ❌ Server not responding: ${error}`);
    console.log('   💡 Make sure to run: npm run dev\n');
    return;
  }

  console.log('📋 Authentication Requirements:');
  console.log('   • Must be logged in as authenticated user');
  console.log('   • User must have is_admin = true in database');
  console.log('   • Session cookie required');
  console.log('   • Access via /admin page in browser\n');

  console.log('🔐 To test manually:');
  console.log('   1. Start dev server: npm run dev');
  console.log('   2. Login as admin user in browser');
  console.log('   3. Navigate to http://localhost:3000/admin');
  console.log('   4. Click "Clear Cache" button\n');
}

// Run the test
testAdminCacheAPI().catch(console.error);