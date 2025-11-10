// components/AlertBanner.tsx
import { resetAlerts } from '@/lib/alerts';

export default function AlertBanner({ alerts }: { alerts: any }) {
  if (!alerts) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-1 p-2 bg-black/50">
      {alerts.stopLoss && (
        <div className="bg-red-600 text-white p-3 rounded-lg shadow-lg animate-pulse text-center text-sm font-bold">
          STOP-LOSS: SELL ALL
        </div>
      )}
      {alerts.takeProfit && (
        <div className="bg-green-600 text-white p-3 rounded-lg shadow-lg animate-bounce text-center text-sm font-bold flex justify-center items-center gap-2">
          TAKE PROFIT: LOCK GAINS
          <button
            onClick={resetAlerts}
            className="bg-white text-green-600 text-xs px-2 py-1 rounded"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}