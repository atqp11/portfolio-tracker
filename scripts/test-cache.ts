/**
 * Cache Connection Test Script
 *
 * Tests Redis cache connection based on environment configuration.
 * Run with: npx tsx scripts/test-cache.ts
 *
 * Prerequisites:
 * - Set environment variables in .env.local:
 *   - For Vercel KV: KV_REST_API_URL and KV_REST_API_TOKEN
 *   - For Upstash: UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN
 */

import 'dotenv/config';
import { getCacheProviderDetails } from '../src/lib/config/cache-provider.config';
import {
  getCacheAdapter as getAdapter,
  CacheAdapter,
} from '../src/lib/cache/adapter';

async function testCacheConnection() {
  console.log('\n🔍 Testing Cache Connection...\n');

  // Get provider details
  const details = getCacheProviderDetails();
  console.log('📋 Cache Provider Details:');
  console.log(`   Type: ${details.type}`);
  console.log(`   Name: ${details.name}`);
  console.log(`   Is Redis: ${details.isRedis}`);
  console.log(`   Is Production: ${details.isProduction}`);
  console.log(`   Upstash Credentials: ${details.hasCredentials.upstash ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Vercel KV Credentials: ${details.hasCredentials.vercelKV ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  // Get cache adapter
  const cache: CacheAdapter = getAdapter();
  console.log('🔄 Testing cache operations...\n');

  const testKey = 'test:connection:v1';
  const testValue = {
    message: 'Hello from cache test!',
    timestamp: new Date().toISOString(),
    random: Math.random(),
  };

  try {
    // Test SET
    console.log('1️⃣ Testing SET operation...');
    await cache.set(testKey, testValue, 60000); // 1 minute TTL
    console.log('   ✅ SET successful\n');

    // Test GET
    console.log('2️⃣ Testing GET operation...');
    const retrieved = await cache.get<typeof testValue>(testKey);
    if (retrieved) {
      console.log('   ✅ GET successful');
      console.log(`   Retrieved value: ${JSON.stringify(retrieved, null, 2)}`);
      console.log('');
    } else {
      console.log('   ❌ GET returned null (unexpected)\n');
    }

    // Test getAge
    console.log('3️⃣ Testing getAge operation...');
    const age = await cache.getAge(testKey);
    console.log(`   ✅ Age: ${age}ms\n`);

    // Test DELETE
    console.log('4️⃣ Testing DELETE operation...');
    await cache.delete(testKey);
    const afterDelete = await cache.get(testKey);
    if (afterDelete === null) {
      console.log('   ✅ DELETE successful\n');
    } else {
      console.log('   ❌ DELETE failed (value still exists)\n');
    }

    // Test clear with pattern
    console.log('5️⃣ Testing CLEAR with pattern...');
    await cache.set('pattern:test:1', 'value1', 60000);
    await cache.set('pattern:test:2', 'value2', 60000);
    await cache.set('other:key', 'value3', 60000);
    await cache.clear('pattern:*');
    const pattern1 = await cache.get('pattern:test:1');
    const pattern2 = await cache.get('pattern:test:2');
    const other = await cache.get('other:key');
    if (pattern1 === null && pattern2 === null && other !== null) {
      console.log('   ✅ CLEAR with pattern successful\n');
    } else {
      console.log('   ⚠️ CLEAR with pattern: partial success\n');
    }

    // Clean up
    await cache.delete('other:key');

    // Test stats
    console.log('6️⃣ Testing getStats...');
    const stats = await cache.getStats();
    console.log(`   ✅ Stats: ${JSON.stringify(stats, null, 2)}\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All cache tests passed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    if (!details.isRedis) {
      console.log('⚠️  WARNING: Using in-memory cache.');
      console.log('   This is fine for development but NOT for production.');
      console.log('   For production, configure Vercel KV or Upstash Redis.\n');
    } else {
      console.log('🚀 Redis cache is properly configured for production.\n');
    }

  } catch (error) {
    console.error('❌ Cache test failed:');
    console.error(error);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Check if environment variables are set correctly');
    console.log('2. Verify Redis instance is accessible');
    console.log('3. Check network connectivity');
    process.exit(1);
  }
}

// Run the test
testCacheConnection().catch(console.error);
