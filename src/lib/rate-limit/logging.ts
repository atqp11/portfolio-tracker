import { createAdminClient } from '@lib/supabase/admin';

export async function logRateLimitViolation(
  userId: string | null,
  ipAddress: string,
  endpoint: string,
  type: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('rate_limit_log').insert({
      user_id: userId,
      ip_address: ipAddress,
      endpoint,
      blocked: true,
      blocked_until: new Date(Date.now() + 60000).toISOString(),
    });
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}
