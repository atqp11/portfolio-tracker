/**
 * Manual script to sync existing Stripe subscription to database
 * Run this once to fix the current subscription
 */

import { createAdminClient } from '../src/lib/supabase/admin';

async function syncSubscription() {
  const supabase = createAdminClient();

  const userId = '6e762042-f284-4378-9f61-225f54a19689';
  const subscriptionId = 'sub_1ScbVqPLpdAQZEGgSQ1AODaR';
  const customerId = 'cus_TZjCm6tzGOZTpt';
  const tier = 'basic';
  const status = 'trialing';
  const trialEnd = new Date(1766537052 * 1000).toISOString();
  const periodStart = new Date(1765327452 * 1000).toISOString();
  const periodEnd = new Date(1766537052 * 1000).toISOString();

  console.log('🔄 Syncing subscription to database...');
  console.log(`   User ID: ${userId}`);
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   Tier: ${tier}`);
  console.log(`   Status: ${status}`);

  const { data, error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      subscription_tier: tier,
      tier: tier, // Update the tier field used by quota system
      trial_ends_at: trialEnd,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select();

  if (error) {
    console.error('❌ Failed to update profile:', error.message);
    process.exit(1);
  }

  console.log('✅ Subscription synced successfully!');
  console.log('   Updated profile:', data);
  process.exit(0);
}

syncSubscription().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
