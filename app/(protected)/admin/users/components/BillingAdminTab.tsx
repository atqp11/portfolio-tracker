import BillingOverview from './BillingOverview';
import WebhookLogsTable from './WebhookLogsTable';
import SyncErrorsTable from './SyncErrorsTable';
import UserErrorsRepair from './UserErrorsRepair';

interface BillingAdminTabProps {
  searchParams: Promise<URLSearchParams | Record<string, string | string[]>>;
}

export default async function BillingAdminTab({ searchParams }: BillingAdminTabProps) {
  return (
    <div className="space-y-6">
      <BillingOverview />
      <UserErrorsRepair />
      <WebhookLogsTable searchParams={searchParams} />
      <SyncErrorsTable />
    </div>
  );
}


