import BillingOverview from './BillingOverview';
import WebhookLogsTable from './WebhookLogsTable';
import SyncErrorsTable from './SyncErrorsTable';
import UserErrorsRepair from './UserErrorsRepair';

export default async function BillingAdminTab() {
  return (
    <div className="space-y-6">
      <BillingOverview />
      <UserErrorsRepair />
      <WebhookLogsTable />
      <SyncErrorsTable />
    </div>
  );
}


