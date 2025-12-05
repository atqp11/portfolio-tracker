/**
 * Create Test User for E2E Testing
 *
 * Creates a test user in Supabase Auth for E2E testing.
 * Run this script to set up the test user before running E2E tests.
 *
 * Usage: npx tsx scripts/create-test-user.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestUser() {
  const email = process.env.E2E_TEST_EMAIL || 'test@example.com';
  const password = process.env.E2E_TEST_PASSWORD || 'testpassword123';

  try {
    console.log(`Creating test user: ${email}`);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === email);

    if (existingUser) {
      console.log('Test user already exists');
      return;
    }

    // Create the user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation for testing
      user_metadata: {
        name: 'Test User',
      },
    });

    if (error) {
      console.error('Error creating test user:', error);
      process.exit(1);
    }

    console.log('Test user created successfully:', data.user.email);

    // Wait a moment for the profile trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

createTestUser();