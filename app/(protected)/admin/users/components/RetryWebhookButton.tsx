'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { retryWebhook } from '../../actions';

interface RetryWebhookButtonProps {
  eventId: string;
}

export default function RetryWebhookButton({ eventId }: RetryWebhookButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      try {
        await retryWebhook(eventId);
        alert('Webhook retry initiated successfully');
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'An error occurred');
      }
    });
  };

  return (
    <button
      onClick={handleRetry}
      disabled={isPending}
      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Retrying...' : 'Retry Webhook'}
    </button>
  );
}
