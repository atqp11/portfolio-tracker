/**
 * Manual Subscription Sync Script
 * 
 * Detects and syncs subscription mismatches between Stripe and Supabase.
 * Can sync a specific user by email or sync all mismatched users.
 * 
 * Usage:
 *   npm run ts-node scripts/sync-subscriptions.ts --email user@example.com
 *   npm run ts-node scripts/sync-subscriptions.ts --all
 *   npm run ts-node scripts/sync-subscriptions.ts --detect-only
 */

import { billingService } from '../src/backend/modules/billing/service/billing.service';
import { createAdminClient } from '../src/lib/supabase/admin';

async function main() {
  const args = process.argv.slice(2);
  const emailFlag = args.indexOf('--email');
  const allFlag = args.indexOf('--all');
  const detectOnlyFlag = args.indexOf('--detect-only');

  console.log('🔍 Subscription Sync Script');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Detect all mismatches
  console.log('🔍 Detecting subscription mismatches...\n');
  const mismatches = await billingService.detectAllMismatches();

  if (mismatches.length === 0) {
    console.log('✅ No subscription mismatches found!');
    process.exit(0);
  }

  console.log(`\n⚠️  Found ${mismatches.length} subscription mismatches:\n`);
  
  // Display mismatches in a table format
  console.log('┌─────────────────────────────────────┬──────────────────────┬──────────────┬────────────────┐');
  console.log('│ User Email                          │ Stripe Status        │ DB Status    │ Missing in DB  │');
  console.log('├─────────────────────────────────────┼──────────────────────┼──────────────┼────────────────┤');
  
  for (const mismatch of mismatches) {
    const email = (mismatch.email || 'No email').padEnd(35);
    const stripeStatus = (mismatch.stripeStatus || 'N/A').padEnd(20);
    const dbStatus = (mismatch.dbStatus || 'null').padEnd(12);
    const missingInDb = (mismatch.missingInDb ? 'YES' : 'No').padEnd(14);
    
    console.log(`│ ${email} │ ${stripeStatus} │ ${dbStatus} │ ${missingInDb} │`);
  }
  
  console.log('└─────────────────────────────────────┴──────────────────────┴──────────────┴────────────────┘\n');

  // If detect-only flag, exit after displaying mismatches
  if (detectOnlyFlag !== -1) {
    console.log('ℹ️  Detect-only mode. Use --all or --email to sync.');
    process.exit(0);
  }

  // Sync specific user by email
  if (emailFlag !== -1 && args[emailFlag + 1]) {
    const email = args[emailFlag + 1];
    console.log(`\n🔄 Syncing subscription for user: ${email}\n`);

    // Find user by email
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !profile) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    try {
      await billingService.syncMissingSubscription(profile.id);
      console.log(`✅ Successfully synced subscription for ${email}`);
    } catch (error) {
      console.error(`❌ Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }

    process.exit(0);
  }

  // Sync all mismatches
  if (allFlag !== -1) {
    console.log(`\n🔄 Syncing all ${mismatches.length} mismatched subscriptions...\n`);

    const result = await billingService.syncAllMissingSubscriptions();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Sync Results:');
    console.log(`   ✅ Successfully synced: ${result.synced}`);
    console.log(`   ❌ Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error) => console.log(`   - ${error}`));
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(result.failed > 0 ? 1 : 0);
  }

  // No sync action specified
  console.log('ℹ️  No sync action specified.');
  console.log('\nUsage:');
  console.log('  --detect-only                  Only detect mismatches, do not sync');
  console.log('  --email user@example.com       Sync specific user by email');
  console.log('  --all                          Sync all mismatched users');
  console.log('\nExamples:');
  console.log('  npm run ts-node scripts/sync-subscriptions.ts --detect-only');
  console.log('  npm run ts-node scripts/sync-subscriptions.ts --email amira3@gmail.com');
  console.log('  npm run ts-node scripts/sync-subscriptions.ts --all\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
