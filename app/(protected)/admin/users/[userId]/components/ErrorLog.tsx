
'use client';

interface NormalizedTransaction {
  id: string;
  event_type: string;
  status: string;
  metadata?: any;
  createdIso?: string | null;
}

interface ErrorLogProps {
  transactions: NormalizedTransaction[];
}

export default function ErrorLog({ transactions }: ErrorLogProps) {
  const errors = transactions?.filter(t => t.status === 'failed') || [];

  if (errors.length === 0) {
    return (
      <div className="bg-transparent p-0 mt-0 text-gray-100">
        <h2 className="text-xl font-bold mb-4 text-red-400">Errors & Issues</h2>
        <div className="text-gray-400">No errors to display.</div>
      </div>
    );
  }

  return (
    <div className="bg-transparent p-0 mt-0 text-gray-100 border-l-4 border-red-600">
      <h2 className="text-xl font-bold mb-4 text-red-400">Errors & Issues</h2>
      <div className="space-y-4">
        {errors.map((error) => (
          <div key={error.id} className="bg-red-900 p-3 rounded">
            <div className="font-semibold text-red-200">{error.event_type} Failed</div>
            {/* Use server-provided ISO string for deterministic rendering */}
            <div className="text-sm text-red-300">{error.createdIso ? error.createdIso.replace('T', ' ').slice(0, 19) : '—'}</div>
            <div className="mt-2 text-sm text-gray-300">
              {JSON.stringify(error.metadata)}
            </div>
            <div className="mt-2">
              <button 
                className="text-xs bg-transparent border border-red-600 text-red-300 px-2 py-1 rounded hover:bg-red-800"
                onClick={() => alert('Retry functionality to be implemented')}
              >
                Retry Action
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
